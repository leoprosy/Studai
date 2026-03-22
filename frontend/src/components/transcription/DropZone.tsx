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
      className={`
        relative group cursor-pointer
        rounded-2xl border-2 border-dashed
        transition-all duration-300 ease-out
        min-h-[280px] flex flex-col items-center justify-center
        ${
          disabled
            ? "border-surface-700/30 bg-surface-900/20 cursor-not-allowed opacity-50"
            : isDragOver
              ? "border-brand-400 bg-brand-500/10 scale-[1.02] shadow-2xl shadow-brand-500/20"
              : "border-surface-600/50 bg-surface-900/30 hover:border-brand-500/50 hover:bg-surface-800/40"
        }
      `}
    >
      {/* Background glow effect */}
      <div
        className={`
        absolute inset-0 rounded-2xl transition-opacity duration-500
        bg-gradient-to-b from-brand-500/5 to-transparent
        ${isDragOver ? "opacity-100" : "opacity-0 group-hover:opacity-50"}
      `}
      />

      {/* Icon */}
      <div
        className={`
        relative z-10 mb-6 p-5 rounded-2xl
        transition-all duration-300
        ${
          isDragOver
            ? "bg-brand-500/20 scale-110"
            : "bg-surface-800/60 group-hover:bg-brand-500/10 group-hover:scale-105"
        }
      `}
      >
        <svg
          className={`w-12 h-12 transition-colors duration-300 ${isDragOver ? "text-brand-400" : "text-surface-400 group-hover:text-brand-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>
      </div>

      {/* Text */}
      <div className="relative z-10 text-center px-6">
        <p
          className={`text-lg font-semibold mb-2 transition-colors ${isDragOver ? "text-brand-300" : "text-surface-200"}`}
        >
          {isDragOver
            ? "Déposer le fichier ici"
            : "Glisser-déposer un fichier audio"}
        </p>
        <p className="text-sm text-surface-400 mb-4">
          ou{" "}
          <span className="text-brand-400 font-medium hover:text-brand-300 transition-colors">
            parcourir
          </span>{" "}
          vos fichiers
        </p>
        <p className="text-xs text-surface-500">
          {ACCEPTED_EXTENSIONS.join(" • ")} — max 500 Mo
        </p>
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
