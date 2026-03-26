import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type {
  TranscribeResponse,
  HealthResponse,
  TranscriptionSegment,
} from "../types";

/**
 * Envoie un fichier audio au backend pour transcription complète via Tauri.
 * Retourne le chemin du PDF généré.
 */
export async function transcribeAudio(
  file: File,
  jobId: string,
  onProgress?: (loaded: number, total: number) => void,
  onSegment?: (segment: TranscriptionSegment) => void,
): Promise<TranscribeResponse> {
  const arrayBuffer = await file.arrayBuffer();
  // Passage du byte array au backend Tauri
  const bytes = Array.from(new Uint8Array(arrayBuffer));

  if (onProgress) {
    onProgress(5, 100);
  }

  const unlistenProgress = await listen<{ job_id: string; status: string }>(
    "progress",
    (event) => {
      if (event.payload.job_id === jobId && onProgress) {
        switch (event.payload.status) {
          case "downloading_model":
            onProgress(10, 100);
            break;
          case "transcribing":
            onProgress(30, 100);
            break;
          case "structuring":
            onProgress(60, 100);
            break;
          case "done":
            onProgress(100, 100);
            break;
          case "error":
            onProgress(0, 100);
            break;
        }
      }
    },
  );

  const unlistenSegment = await listen<
    TranscriptionSegment & { job_id: string }
  >("transcription_segment", (event) => {
    if (event.payload.job_id === jobId && onSegment) {
      onSegment({
        text: event.payload.text,
        start: event.payload.start,
        end: event.payload.end,
      });
    }
  });

  try {
    const response = await invoke<TranscribeResponse>("process_audio", {
      jobId, // in case tauri auto-camelCases
      job_id: jobId, // literal match
      filename: file.name,
      bytes,
    });

    unlistenProgress();
    unlistenSegment();
    return response;
  } catch (error) {
    unlistenProgress();
    unlistenSegment();
    throw new Error(String(error));
  }
}

/**
 * Le frontend et le backend sont identiques en distribution Tauri
 */
export async function checkHealth(): Promise<HealthResponse> {
  return { status: "ok", version: "1.0.0" } as any;
}
