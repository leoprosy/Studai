"""
BLOC 2 — Script 1/3
Prend un chemin audio, retourne la transcription brute en texte.
Supporte tous les formats (mp3, wav, m4a, ogg, flac...).
"""

import os
import sys
from faster_whisper import WhisperModel

# Modèle chargé une seule fois (réutilisé par PyO3 ensuite)
_model = None


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
    """
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Fichier audio introuvable : {audio_path}")

    model = get_model()

    print(f"[whisper] Transcription de : {audio_path}", flush=True)

    segments, info = model.transcribe(
        audio_path,
        language="fr",  # Force le français
        beam_size=5,
        vad_filter=True,  # Filtre les silences
        vad_parameters=dict(min_silence_duration_ms=500),
    )

    print(
        f"[whisper] Langue détectée : {info.language} (confiance : {info.language_probability:.0%})",
        flush=True,
    )

    texts = []
    for segment in segments:
        print(
            f"[whisper] [{segment.start:.1f}s → {segment.end:.1f}s] {segment.text.strip()}",
            flush=True,
        )
        texts.append(segment.text.strip())

    full_text = " ".join(texts)
    print(
        f"[whisper] Transcription terminée — {len(full_text)} caractères.", flush=True
    )
    return full_text


# --- Test standalone ---
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage : python whisper_bridge.py <chemin_audio>")
        sys.exit(1)

    result = transcribe(sys.argv[1])
    print("\n--- TRANSCRIPTION ---")
    print(result)
