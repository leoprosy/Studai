import type { PipelineStep } from "../../types";

interface JobProgressProps {
  step: PipelineStep;
  uploadProgress: number;
}

interface StepConfig {
  id: string;
  label: string;
  badge: string;
  className: string;
  activeSteps: PipelineStep[];
  doneSteps: PipelineStep[];
}

const PIPELINE_CONFIG: StepConfig[] = [
  {
    id: "whisper",
    label: "Transcription audio",
    badge: "WHISPER",
    className: "step-whisper",
    activeSteps: ["uploading", "transcribing"],
    doneSteps: ["structuring", "done"],
  },
  {
    id: "llm",
    label: "Structuration IA",
    badge: "MISTRAL",
    className: "step-llm",
    activeSteps: ["structuring"],
    doneSteps: ["done"],
  },
  {
    id: "pdf",
    label: "Mise en page PDF",
    badge: "PDF",
    className: "step-pdf",
    activeSteps: [], // Géré par done pour le moment
    doneSteps: ["done"],
  },
];

export default function JobProgress({
  step,
  uploadProgress,
}: JobProgressProps) {
  return (
    <div className="space-y-3" id="job-progress">
      <div className="text-sm font-medium text-text-secondary mb-4 flex items-center justify-between">
        <span>Traitement en cours...</span>
        <span className="text-xs font-mono opacity-50 uppercase tracking-widest">
          {step.replace("_", " ")}
        </span>
      </div>

      {PIPELINE_CONFIG.map((conf) => {
        const isActive = conf.activeSteps.includes(step);
        const isDone = conf.doneSteps.includes(step);
        const isPending = !isActive && !isDone;

        // Pour Whisper, on utilise l'uploadProgress si on est en phase d'upload
        const progress = isDone
          ? 100
          : isActive
            ? step === "uploading"
              ? uploadProgress
              : 87
            : 0;

        return (
          <div
            key={conf.id}
            className={`pipeline-step ${conf.className} ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <span
                  className={`badge ${isPending ? "badge-pending" : `badge-${conf.id}`}`}
                >
                  {conf.badge}
                </span>
                <span
                  className={`text-sm font-medium ${isPending ? "text-text-muted" : "text-text-primary"}`}
                >
                  {conf.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isActive && (
                  <span className="text-xs font-mono text-accent animate-pulse">
                    {progress}%
                  </span>
                )}
                {isDone && (
                  <span className="text-success text-xs font-bold">✓ FAIT</span>
                )}
                {isPending && (
                  <span className="text-text-muted text-[10px] font-bold uppercase tracking-wider">
                    En attente
                  </span>
                )}
              </div>
            </div>

            <div className="progress-bar-track">
              <div
                className={`progress-bar-fill ${isActive ? "in-progress" : ""}`}
                style={{
                  width: `${progress}%`,
                  backgroundColor: isDone
                    ? "var(--success)"
                    : `var(--step-${conf.id})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
