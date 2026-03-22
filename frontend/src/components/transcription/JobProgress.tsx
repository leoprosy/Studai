import type { PipelineStep } from "../../types";

interface JobProgressProps {
  step: PipelineStep;
  uploadProgress: number;
}

interface StepInfo {
  key: PipelineStep;
  label: string;
  icon: string;
}

const STEPS: StepInfo[] = [
  { key: "uploading", label: "Upload du fichier", icon: "📤" },
  { key: "transcribing", label: "Transcription Whisper", icon: "🎙️" },
  { key: "structuring", label: "Structuration IA", icon: "🧠" },
  { key: "generating_pdf", label: "Génération PDF", icon: "📄" },
];

function getStepIndex(step: PipelineStep): number {
  const idx = STEPS.findIndex((s) => s.key === step);
  if (step === "done") return STEPS.length;
  return idx;
}

export default function JobProgress({
  step,
  uploadProgress,
}: JobProgressProps) {
  const currentIdx = getStepIndex(step);

  return (
    <div className="card animate-slide-up" id="job-progress">
      <div className="space-y-4">
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone = currentIdx > i || step === "done";
          const isPending = currentIdx < i;

          return (
            <div key={s.key} className="flex items-center gap-4">
              {/* Icône de statut */}
              <div
                className={`
                flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                transition-all duration-500
                ${
                  isDone
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : isActive
                      ? "bg-brand-500/20 border border-brand-500/40 animate-pulse-slow"
                      : "bg-surface-800/60 border border-surface-700/50"
                }
              `}
              >
                {isDone ? (
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  <span
                    className={`text-lg ${isActive ? "" : "grayscale opacity-40"}`}
                  >
                    {s.icon}
                  </span>
                )}
              </div>

              {/* Label + barre de progression */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium transition-colors ${isDone ? "text-emerald-300" : isActive ? "text-surface-100" : "text-surface-500"}`}
                >
                  {s.label}
                  {isDone && (
                    <span className="text-emerald-500 ml-2 text-xs font-normal">
                      ✓ terminé
                    </span>
                  )}
                </p>

                {/* Barre de progression spéciale pour l'upload */}
                {isActive && s.key === "uploading" && (
                  <div className="mt-2 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}

                {/* Spinner pour les étapes en cours (hors upload) */}
                {isActive && s.key !== "uploading" && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-xs text-surface-400">
                      En cours...
                    </span>
                  </div>
                )}

                {isPending && (
                  <p className="text-xs text-surface-600 mt-0.5">En attente</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre globale */}
      <div className="mt-6 h-1 bg-surface-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-400"
          style={{
            width: `${step === "done" ? 100 : Math.max(5, (currentIdx / STEPS.length) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
