import { useEffect } from "react";
import { useAppStore } from "../store/appStore";
import type { PipelineStep } from "../types";
import { listen } from "@tauri-apps/api/event";

export function usePipelineWebSocket(jobId?: string) {
  const { setStep, setError } = useAppStore();

  useEffect(() => {
    if (!jobId) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<{ job_id: string; status: string }>(
        "progress",
        (event) => {
          if (event.payload.job_id !== jobId) return;

          const msg = event.payload.status;

          if (msg === "error") {
            setError("Une erreur s'est produite lors du traitement.");
            return;
          }

          if (
            ["transcribing", "structuring", "generating_pdf", "done"].includes(
              msg,
            )
          ) {
            setStep(msg as PipelineStep);
          }
        },
      );
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [jobId, setStep, setError]);
}
