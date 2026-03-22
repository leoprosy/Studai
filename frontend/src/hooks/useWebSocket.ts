import { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import type { PipelineStep } from "../types";

export function usePipelineWebSocket(jobId?: string) {
  const ws = useRef<WebSocket | null>(null);
  const { setStep, setError } = useAppStore();

  useEffect(() => {
    if (!jobId) return;

    // Se connecter au backend
    const url = `ws://127.0.0.1:8001/ws?job_id=${jobId}`;
    ws.current = new WebSocket(url);

    ws.current.onmessage = (event) => {
      const msg = event.data as string;

      if (msg.startsWith("error:")) {
        setError(msg.replace("error:", ""));
        return;
      }

      if (
        ["transcribing", "structuring", "generating_pdf", "done"].includes(msg)
      ) {
        setStep(msg as PipelineStep);
      }
    };

    ws.current.onerror = () => {
      console.error("Erreur WebSocket !");
      // On ne lève pas forcément d'erreur fatale ici, le fetch API principal gère déjà sa propre erreur
    };

    return () => {
      ws.current?.close();
    };
  }, [jobId, setStep, setError]);
}
