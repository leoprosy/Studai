import type { TranscribeResponse, HealthResponse } from "../types";

const BACKEND_URL = "http://127.0.0.1:8001";

/**
 * Envoie un fichier audio au backend pour transcription complète.
 * Retourne le chemin du PDF généré.
 */
export async function transcribeAudio(
  file: File,
  jobId: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<TranscribeResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // Utiliser XMLHttpRequest pour le suivi de progression d'upload
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const data: TranscribeResponse = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          reject(new Error("Réponse invalide du serveur"));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Erreur réseau — le backend est-il lancé ?"));
      });

      xhr.addEventListener("timeout", () => {
        reject(new Error("Timeout — la transcription a pris trop de temps"));
      });

      xhr.open("POST", `${BACKEND_URL}/transcribe?job_id=${jobId}`);
      xhr.timeout = 600_000; // 10 minutes
      xhr.send(formData);
    });
  }

  // Fallback sans progression
  const response = await fetch(`${BACKEND_URL}/transcribe?job_id=${jobId}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Erreur serveur (${response.status})`);
  }

  return response.json();
}

/**
 * Vérifie que le backend est accessible.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${BACKEND_URL}/health`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Backend inaccessible (${response.status})`);
  }

  return response.json();
}
