import type { AudioFileInfo } from "../../types";

interface FilePreviewProps {
  file: AudioFileInfo;
  onRemove: () => void;
  disabled?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getExtension(name: string): string {
  return name.split(".").pop()?.toUpperCase() || "?";
}

export default function FilePreview({
  file,
  onRemove,
  disabled,
}: FilePreviewProps) {
  const ext = getExtension(file.name);

  return (
    <div
      className="card animate-scale-in flex items-center gap-4"
      id="file-preview"
    >
      {/* Icon fichier audio */}
      <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-brand-500/15 border border-brand-500/20 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-6 h-6 text-brand-400 mx-auto mb-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"
            />
          </svg>
          <span className="text-[10px] font-bold text-brand-300">{ext}</span>
        </div>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-100 truncate">
          {file.name}
        </p>
        <p className="text-xs text-surface-400 mt-0.5">
          {formatSize(file.size)}
        </p>
      </div>

      {/* Bouton supprimer */}
      {!disabled && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 p-2 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          title="Retirer le fichier"
          id="remove-file-btn"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
