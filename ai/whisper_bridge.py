"""
BLOC 2 — Script 1/3
Prend un chemin audio, retourne la transcription brute en texte.
Supporte tous les formats (mp3, wav, m4a, ogg, flac...).
"""

import os
import sys
import subprocess
import tempfile
from faster_whisper import WhisperModel

# Modèle chargé une seule fois (réutilisé par PyO3 ensuite)
_model = None

# Taille minimale pour un fichier audio valide (10 KB)
MIN_AUDIO_SIZE = 10 * 1024

# Signatures magiques des formats audio courants
AUDIO_MAGIC_BYTES = {
    b'\xff\xfb': 'mp3 (MPEG frame)',
    b'\xff\xf3': 'mp3 (MPEG frame)',
    b'\xff\xf2': 'mp3 (MPEG frame)',
    b'ID3':      'mp3 (ID3 tag)',
    b'RIFF':     'wav',
    b'fLaC':     'flac',
    b'OggS':     'ogg/vorbis',
    b'\x1aE\xdf\xa3': 'webm/mkv',
}


def _validate_audio_file(audio_path: str) -> None:
    """
    Vérifie qu'un fichier est un vrai fichier audio.
    Lève une exception claire si le fichier est invalide.
    """
    file_size = os.path.getsize(audio_path)

    if file_size < MIN_AUDIO_SIZE:
        # Lire le contenu pour un meilleur diagnostic
        with open(audio_path, 'rb') as f:
            content = f.read(256)

        # Vérifier si c'est du texte (chemin de fichier stocké par erreur)
        try:
            text = content.decode('utf-8', errors='strict').strip()
            if text.startswith('/') or text.startswith('C:\\') or text.startswith('.'):
                raise ValueError(
                    f"Le fichier '{audio_path}' contient un chemin texte au lieu de "
                    f"données audio : '{text}'. "
                    f"Vérifiez que le client envoie bien le contenu du fichier "
                    f"(ex: curl -F 'file=@chemin.mp3') et non le chemin comme texte."
                )
        except UnicodeDecodeError:
            pass

        raise ValueError(
            f"Le fichier '{audio_path}' est trop petit pour être un fichier audio "
            f"valide ({file_size} octets, minimum attendu: {MIN_AUDIO_SIZE} octets). "
            f"Le fichier est peut-être tronqué ou corrompu."
        )

    # Vérifier les magic bytes
    with open(audio_path, 'rb') as f:
        header = f.read(12)

    is_known_format = False
    for magic, fmt_name in AUDIO_MAGIC_BYTES.items():
        if header.startswith(magic):
            is_known_format = True
            print(f"[whisper] Format détecté : {fmt_name}", flush=True)
            break

    # Vérifier le cas spécial m4a/mp4 (byte 4-8 = 'ftyp')
    if not is_known_format and len(header) >= 8 and header[4:8] == b'ftyp':
        is_known_format = True
        print("[whisper] Format détecté : m4a/mp4 (ftyp)", flush=True)

    if not is_known_format:
        print(
            f"[whisper] ⚠ Format audio non reconnu par les magic bytes "
            f"(header: {header[:8].hex()}). Tentative de conversion FFmpeg...",
            flush=True,
        )


def _convert_to_wav(audio_path: str) -> str:
    """
    Convertit un fichier audio en WAV 16kHz mono via FFmpeg.
    Retourne le chemin du fichier WAV temporaire.
    """
    wav_path = tempfile.mktemp(suffix=".wav", prefix="whisper_")

    cmd = [
        "ffmpeg",
        "-y",                # Écraser si existant
        "-i", audio_path,    # Fichier source
        "-ar", "16000",      # 16kHz (optimal pour Whisper)
        "-ac", "1",          # Mono
        "-c:a", "pcm_s16le", # PCM 16-bit
        wav_path,
    ]

    print(f"[whisper] Conversion FFmpeg : {audio_path} → WAV 16kHz", flush=True)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"FFmpeg a échoué (code {result.returncode}).\n"
                f"Stderr: {result.stderr[-500:] if result.stderr else '(vide)'}"
            )
    except FileNotFoundError:
        raise RuntimeError(
            "FFmpeg n'est pas installé. Installez-le avec : "
            "sudo apt install ffmpeg (Linux) ou brew install ffmpeg (macOS)"
        )

    if not os.path.exists(wav_path) or os.path.getsize(wav_path) < 100:
        raise RuntimeError(
            f"FFmpeg n'a pas produit de fichier WAV valide pour '{audio_path}'."
        )

    print(
        f"[whisper] Conversion réussie ({os.path.getsize(wav_path)} octets)",
        flush=True,
    )
    return wav_path


def get_model():
    global _model
    if _model is None:
        model_size = os.getenv("WHISPER_MODEL", "small")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        print(
            f"[whisper] Chargement du modèle '{model_size}' sur '{device}'...",
            flush=True,
        )
        _model = WhisperModel(model_size, device=device, compute_type="int8")
        print("[whisper] Modèle prêt.", flush=True)
    return _model


def transcribe(audio_path: str) -> str:
    """
    Transcrit un fichier audio et retourne le texte brut.

    Args:
        audio_path: Chemin absolu vers le fichier audio

    Returns:
        Texte transcrit complet

    Raises:
        FileNotFoundError: si le fichier n'existe pas
        ValueError: si le fichier n'est pas un fichier audio valide
        RuntimeError: si la conversion FFmpeg échoue
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Fichier audio introuvable : {audio_path}")

    # Valider que le fichier est bien un fichier audio
    _validate_audio_file(audio_path)

    # Convertir en WAV 16kHz via FFmpeg pour éviter les problèmes de décodage
    wav_path = None
    file_to_transcribe = audio_path

    # Toujours convertir en WAV sauf si c'est déjà du WAV 16kHz
    ext = os.path.splitext(audio_path)[1].lower()
    if ext != ".wav":
        try:
            wav_path = _convert_to_wav(audio_path)
            file_to_transcribe = wav_path
        except Exception as e:
            print(f"[whisper] ⚠ Conversion échouée, tentative directe : {e}", flush=True)
            file_to_transcribe = audio_path

    model = get_model()

    print(f"[whisper] Transcription de : {file_to_transcribe}", flush=True)

    try:
        segments, info = model.transcribe(
            file_to_transcribe,
            language="fr",  # Force le français
            beam_size=5,
            vad_filter=True,  # Filtre les silences
            vad_parameters=dict(min_silence_duration_ms=500),
        )

        print(
            f"[whisper] Langue détectée : {info.language} "
            f"(confiance : {info.language_probability:.0%})",
            flush=True,
        )

        texts = []
        for segment in segments:
            print(
                f"[whisper] [{segment.start:.1f}s → {segment.end:.1f}s] "
                f"{segment.text.strip()}",
                flush=True,
            )
            texts.append(segment.text.strip())

        full_text = " ".join(texts)
        print(
            f"[whisper] Transcription terminée — {len(full_text)} caractères.",
            flush=True,
        )
        return full_text

    finally:
        # Nettoyer le fichier WAV temporaire
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
                print(f"[whisper] Fichier WAV temporaire supprimé.", flush=True)
            except OSError:
                pass


# --- Test standalone ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage : python whisper_bridge.py <chemin_audio>")
        sys.exit(1)

    result = transcribe(sys.argv[1])
    print("\n--- TRANSCRIPTION ---")
    print(result)
