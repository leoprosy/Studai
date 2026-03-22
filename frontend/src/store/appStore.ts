import { create } from "zustand";
import type { PipelineStep, AudioFileInfo } from "../types";

interface AppState {
  // ── État pipeline ──
  jobId: string | null;
  step: PipelineStep;
  audioFile: AudioFileInfo | null;
  uploadProgress: number; // 0-100
  pdfPath: string | null;
  error: string | null;

  // ── Actions ──
  setJobId: (id: string | null) => void;
  setAudioFile: (file: AudioFileInfo | null) => void;
  setStep: (step: PipelineStep) => void;
  setUploadProgress: (progress: number) => void;
  setPdfPath: (path: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState = {
  jobId: null as string | null,
  step: "idle" as PipelineStep,
  audioFile: null as AudioFileInfo | null,
  uploadProgress: 0,
  pdfPath: null as string | null,
  error: null as string | null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setJobId: (id) => set({ jobId: id }),

  setAudioFile: (file) => set({ audioFile: file, error: null }),

  setStep: (step) => set({ step }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setPdfPath: (path) => set({ pdfPath: path, step: "done" }),

  setError: (error) => set({ error, step: "error" }),

  reset: () => set(initialState),
}));
