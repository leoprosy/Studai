import { useCallback, useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";
import { ACCEPTED_EXTENSIONS } from "../../types";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export default function DropZone({ onFileSelect, disabled }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect, disabled],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      // Reset pour permettre de re-sélectionner le même fichier
      e.target.value = "";
    },
    [onFileSelect],
  );

  return (
    <div
      id="drop-zone"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`dropzone ${isDragOver ? "drag-over" : ""} ${disabled ? "opacity-50 cursor-not-allowed border-surface-700/30 bg-surface-900/20" : ""}`}
    >
      {/* Icon */}
      <div className="dropzone-icon text-5xl mb-4">🎙️</div>

      {/* Content */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-1">
          {isDragOver
            ? "Déposez le fichier ici"
            : "Déposez votre enregistrement"}
        </h3>
        <p className="text-sm text-surface-400 mb-8 font-mono">
          {ACCEPTED_EXTENSIONS.join(", ").toUpperCase()}
        </p>

        {!isDragOver && (
          <>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-[1px] w-12 bg-border-default"></div>
              <span className="text-[10px] text-text-muted uppercase tracking-[2px] font-bold">
                ou
              </span>
              <div className="h-[1px] w-12 bg-border-default"></div>
            </div>

            <button
              className="bg-bg-elevated text-text-secondary px-6 py-2.5 rounded-lg border border-border-default font-semibold text-sm hover:border-accent hover:text-white transition-all shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              Choisir un fichier
            </button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={handleChange}
        className="hidden"
        id="audio-file-input"
      />
    </div>
  );
}
