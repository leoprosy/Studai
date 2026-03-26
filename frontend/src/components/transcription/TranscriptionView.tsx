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
    <div className="file-card animate-fade-up" id="file-preview">
      <div className="text-xl opacity-60">🎵</div>

      <div className="flex-1 min-w-0">
        <p className="file-card-name truncate">{file.name}</p>
        <p className="file-card-meta">
          {formatSize(file.size)} · {ext}
        </p>
      </div>

      {!disabled && (
        <button
          onClick={onRemove}
          className="p-2 -mr-2 text-text-muted hover:text-text-primary transition-colors"
          title="Retirer le fichier"
          id="remove-file-btn"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
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
