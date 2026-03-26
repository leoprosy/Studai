import { useTranscription } from "../hooks/useTranscription";
import { usePipelineWebSocket } from "../hooks/useWebSocket";
import DropZone from "../components/transcription/DropZone";
import FilePreview from "../components/transcription/TranscriptionView";
import JobProgress from "../components/transcription/JobProgress";
import Sidebar from "../components/Sidebar";

export default function Home() {
  const {
    jobId,
    step,
    audioFile,
    uploadProgress,
    currentTranscriptionSegment,
    error,
    selectFile,
    startTranscription,
    reset,
  } = useTranscription();

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Connecte au WebSocket dès qu'on a un jobId
  usePipelineWebSocket(jobId || undefined);

  const isProcessing = ["uploading", "transcribing", "structuring"].includes(
    step,
  );

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      {/* Sidebar - Fixe à gauche */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header simple style.md Section 4.1 */}
        <header className="h-[52px] flex-shrink-0 flex items-center justify-between px-8 border-b border-border-subtle bg-bg-primary">
          <h2 className="text-sm font-bold text-text-primary tracking-tight">
            Nouvelle transcription
          </h2>

          {(step !== "idle" || audioFile) && (
            <button
              onClick={reset}
              disabled={isProcessing}
              className="text-xs font-bold text-accent hover:opacity-80 disabled:opacity-30 uppercase tracking-widest"
              id="reset-btn"
            >
              Réinitialiser
            </button>
          )}
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto px-8 py-10 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {/* Titre de bienvenue */}
            {step === "idle" && !audioFile && (
              <div className="mb-12 animate-fade-up">
                <h1 className="text-[28px] font-extrabold text-text-primary mb-4 tracking-tight leading-tight">
                  Transforme tes cours en <br />
                  <span className="text-accent underline decoration-accent/20 underline-offset-8">
                    notes structurées.
                  </span>
                </h1>
                <p className="text-text-secondary max-w-lg leading-relaxed text-sm">
                  Dépose un enregistrement audio et obtiens un PDF complet avec
                  transcription et structuration IA.
                </p>
              </div>
            )}

            {/* Drop Zone */}
            {step === "idle" && !audioFile && (
              <DropZone onFileSelect={selectFile} disabled={isProcessing} />
            )}

            {/* Fichier sélectionné, avant processing */}
            {audioFile && step === "idle" && (
              <div className="animate-fade-up space-y-6">
                <FilePreview
                  file={audioFile}
                  onRemove={reset}
                  disabled={isProcessing}
                />

                <button
                  onClick={startTranscription}
                  className="btn-primary flex items-center justify-center gap-3"
                  id="start-btn"
                >
                  <span className="text-lg">▶</span>
                  Transcrire le cours
                </button>
              </div>
            )}

            {/* Pipeline components */}
            {isProcessing && audioFile && (
              <div className="space-y-8 animate-fade-up">
                <JobProgress step={step} uploadProgress={uploadProgress} />

                {/* Streaming text feedback */}
                {step === "transcribing" && currentTranscriptionSegment && (
                  <div className="bg-bg-secondary p-6 rounded-xl border border-border-default max-h-80 overflow-y-auto space-y-4 shadow-sm">
                    <div className="flex gap-4 group animate-fade-up">
                      <div className="flex-shrink-0 font-mono text-[10px] text-accent/70 bg-accent/5 px-2 py-1 rounded border border-accent/10 h-fit">
                        {formatTime(currentTranscriptionSegment.start)}
                      </div>
                      <p className="text-[13px] leading-relaxed text-text-primary opacity-80">
                        {currentTranscriptionSegment.text}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terminée — Succès style.md Section 4.7 */}
            {step === "done" && (
              <div className="animate-pop-in text-center p-10 bg-bg-secondary border border-success rounded-2xl shadow-xl shadow-success/5">
                <div className="text-5xl mb-6">✓</div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Cours généré avec succès
                </h2>
                <p className="text-xs font-mono text-text-secondary mb-8 opacity-60">
                  {audioFile?.name?.replace(/\.[^/.]+$/, "")}_NOTE.pdf · 124 Ko
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
                  <button className="bg-success text-bg-primary font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-all flex items-center gap-2">
                    <span className="text-lg">📄</span> Ouvrir le PDF
                  </button>
                  <button className="bg-bg-elevated text-text-secondary font-bold px-8 py-3 rounded-lg border border-border-default hover:border-accent hover:text-white transition-all">
                    Ouvrir le dossier
                  </button>
                </div>

                <div className="h-[1px] bg-border-subtle w-full mb-8"></div>

                <button
                  onClick={reset}
                  className="text-accent font-bold text-sm hover:underline underline-offset-4"
                >
                  + Transcrire un autre cours
                </button>
              </div>
            )}

            {/* Error state */}
            {step === "error" && error && (
              <div className="animate-pop-in space-y-6">
                <div className="bg-bg-secondary border border-error/30 p-8 rounded-2xl text-center">
                  <div className="text-4xl mb-4">✕</div>
                  <h3 className="text-lg font-bold text-error mb-2">
                    Erreur de traitement
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed max-w-md mx-auto mb-8">
                    {error}
                  </p>
                  <button
                    onClick={reset}
                    className="btn-primary !w-auto !px-10"
                    id="retry-btn"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer simple Section 11 preview */}
        <footer className="h-[40px] flex-shrink-0 flex items-center justify-between px-8 border-t border-border-subtle/40 bg-bg-secondary/20">
          <div className="flex items-center gap-4 text-[10px] text-text-muted font-bold uppercase tracking-[1.5px]">
            <span>Studai v0.1.0</span>
            <span className="w-1 h-1 rounded-full bg-border-strong opacity-50"></span>
            <span>Local Processing</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-success font-bold uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
            Whisper Active
          </div>
        </footer>
      </div>
    </div>
  );
}
