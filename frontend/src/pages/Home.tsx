import { useTranscription } from "../hooks/useTranscription";
import { usePipelineWebSocket } from "../hooks/useWebSocket";
import DropZone from "../components/transcription/DropZone";
import FilePreview from "../components/transcription/TranscriptionView";
import JobProgress from "../components/transcription/JobProgress";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const {
    jobId,
    step,
    audioFile,
    uploadProgress,
    markdown,
    error,
    selectFile,
    startTranscription,
    reset,
  } = useTranscription();

  // Connecte au WebSocket dès qu'on a un jobId
  usePipelineWebSocket(jobId || undefined);

  const isProcessing = ["uploading", "transcribing", "structuring"].includes(
    step,
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 px-8 py-6 border-b border-surface-800/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Studai</h1>
              <p className="text-xs text-surface-500">
                Transcripteur de cours intelligent
              </p>
            </div>
          </div>

          {(step !== "idle" || audioFile) && (
            <button
              onClick={reset}
              disabled={isProcessing}
              className="btn-secondary text-sm !px-4 !py-2 disabled:opacity-30"
              id="reset-btn"
            >
              Nouveau
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-8 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Titre de bienvenue */}
          {step === "idle" && !audioFile && (
            <div className="text-center mb-8 animate-fade-in">
              <h2 className="text-3xl font-bold text-surface-100 mb-3 text-balance">
                Transforme tes cours audio en
                <span className="gradient-text"> notes structurées</span>
              </h2>
              <p className="text-surface-400 max-w-lg mx-auto">
                Dépose un enregistrement audio et obtiens un PDF complet avec
                transcription, structuration IA et mise en forme
                professionnelle.
              </p>
            </div>
          )}

          {/* Drop Zone — visible si idle et pas de fichier sélectionné */}
          {step === "idle" && !audioFile && (
            <DropZone onFileSelect={selectFile} disabled={isProcessing} />
          )}

          {/* Aperçu fichier sélectionné */}
          {audioFile && step === "idle" && (
            <div className="animate-slide-up space-y-4">
              <FilePreview
                file={audioFile}
                onRemove={reset}
                disabled={isProcessing}
              />
              <button
                onClick={startTranscription}
                className="btn-primary w-full text-base"
                id="start-btn"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                    />
                  </svg>
                  Lancer la transcription
                </span>
              </button>
            </div>
          )}

          {/* Progression du pipeline */}
          {isProcessing && audioFile && (
            <div className="space-y-4">
              <FilePreview file={audioFile} onRemove={() => {}} disabled />
              <JobProgress step={step} uploadProgress={uploadProgress} />
            </div>
          )}

          {/* Succès — Markdown prêt */}
          {step === "done" && markdown && (
            <div className="animate-scale-in space-y-6">
              <div className="card prose prose-invert prose-brand max-w-none prose-headings:text-brand-300 prose-a:text-brand-400 bg-surface-900/40 p-8 rounded-2xl border border-surface-700/50">
                <ReactMarkdown>{markdown}</ReactMarkdown>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={reset}
                  className="btn-primary flex items-center gap-2"
                  id="new-transcription-btn"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                  Nouvelle transcription
                </button>
              </div>
            </div>
          )}

          {/* Erreur */}
          {step === "error" && error && (
            <div className="animate-scale-in space-y-4">
              <div className="card border-red-500/30 bg-red-500/5">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-300">
                      Erreur
                    </h3>
                    <p className="text-sm text-surface-300 mt-1">{error}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={reset}
                className="btn-primary w-full"
                id="retry-btn"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Indicateur d'erreur inline (validation fichier) */}
          {step === "idle" && error && !audioFile && (
            <div className="animate-slide-up card border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-amber-400 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <p className="text-sm text-amber-200">{error}</p>
                <button
                  onClick={reset}
                  className="ml-auto text-surface-500 hover:text-surface-300 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex-shrink-0 px-8 py-4 border-t border-surface-800/40">
        <div className="max-w-3xl mx-auto flex items-center justify-between text-xs text-surface-600">
          <span>Studai v0.1.0 — 100% local</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Whisper + Ollama
          </span>
        </div>
      </footer>
    </div>
  );
}
