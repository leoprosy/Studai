import { useCallback } from "react";
import { useAppStore } from "../store/appStore";
import { transcribeAudio } from "../lib/api";
import type { AudioFileInfo } from "../types";
import {
  ACCEPTED_AUDIO_FORMATS,
  ACCEPTED_EXTENSIONS,
  MAX_FILE_SIZE,
} from "../types";

/**
 * Hook encapsulant toute la logique de transcription.
 */
export function useTranscription() {
  const {
    jobId,
    step,
    audioFile,
    uploadProgress,
    pdfPath,
    error,
    setJobId,
    setAudioFile,
    setStep,
    setUploadProgress,
    setPdfPath,
    setError,
    reset,
  } = useAppStore();

  /** Valide et sélectionne un fichier audio */
  const selectFile = useCallback(
    (file: File) => {
      // Vérifier le type MIME
      const isValidType = ACCEPTED_AUDIO_FORMATS.some(
        (fmt) => file.type === fmt,
      );
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const isValidExt = ACCEPTED_EXTENSIONS.some((e) => e === ext);

      if (!isValidType && !isValidExt) {
        setError(
          `Format non supporté (${file.type || ext}). Formats acceptés : ${ACCEPTED_EXTENSIONS.join(", ")}`,
        );
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(
          `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(0)} Mo). Maximum : ${MAX_FILE_SIZE / 1024 / 1024} Mo`,
        );
        return;
      }

      if (file.size < 1024) {
        setError("Fichier trop petit pour être un fichier audio valide.");
        return;
      }

      const info: AudioFileInfo = {
        file,
        name: file.name,
        size: file.size,
        type: file.type || `audio/${ext.replace(".", "")}`,
      };

      setAudioFile(info);
    },
    [setAudioFile, setError],
  );

  /** Lance le pipeline complet */
  const startTranscription = useCallback(async () => {
    if (!audioFile) return;

    try {
      // Générer l'ID pour le websocket de ce job
      const newJobId = crypto.randomUUID();
      setJobId(newJobId);

      // Phase 1 : Upload
      setStep("uploading");
      setUploadProgress(0);

      const result = await transcribeAudio(
        audioFile.file,
        newJobId,
        (loaded, total) => {
          const pct = Math.round((loaded / total) * 100);
          setUploadProgress(pct);
          if (pct >= 100 && step === "uploading") {
            // Seuls les WS dictent "transcribing" désormais
            // Garder uploading tant que le websocket n'a pas reçu le top "transcribing" sinon ça va glitcher
          }
        },
      );

      if (result.success && result.pdf_path) {
        setPdfPath(result.pdf_path);
      } else {
        setError(result.error || "Erreur inconnue lors de la transcription.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    }
  }, [audioFile, setJobId, setStep, setUploadProgress, setPdfPath, setError]);

  return {
    jobId,
    step,
    audioFile,
    uploadProgress,
    pdfPath,
    error,
    selectFile,
    startTranscription,
    reset,
  };
}
