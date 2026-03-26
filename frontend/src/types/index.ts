// ──────────────────────────────────────────
// Types partagés pour Studai
// ──────────────────────────────────────────

/** Étapes du pipeline de transcription */
export type PipelineStep =
  | "idle"
  | "uploading"
  | "transcribing"
  | "structuring"
  | "done"
  | "error";

/** Réponse du backend POST /transcribe */
export interface TranscribeResponse {
  success: boolean;
  markdown: string | null;
  error: string | null;
}

/** Réponse du backend GET /health */
export interface HealthResponse {
  status: string;
  version: string;
}

/** Formats audio acceptés */
export const ACCEPTED_AUDIO_FORMATS = [
  "audio/mpeg", // mp3
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
  "audio/mp4", // m4a
  "audio/x-m4a",
  "audio/aac",
  "audio/webm",
] as const;

export const ACCEPTED_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".m4a",
  ".aac",
  ".webm",
] as const;

/** Taille max d'upload (500 MB) */
export const MAX_FILE_SIZE = 500 * 1024 * 1024;

export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
}

/** Infos sur le fichier audio sélectionné */
export interface AudioFileInfo {
  file: File;
  name: string;
  size: number;
  duration?: number;
  type: string;
}
