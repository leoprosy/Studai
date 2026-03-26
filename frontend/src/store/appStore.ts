import { create } from "zustand";
import type {
  PipelineStep,
  AudioFileInfo,
  TranscriptionSegment,
} from "../types";

interface AppState {
  // ── État pipeline ──
  jobId: string | null;
  step: PipelineStep;
  audioFile: AudioFileInfo | null;
  uploadProgress: number; // 0-100
  markdown: string | null;
  currentTranscriptionSegment: TranscriptionSegment | null;
  error: string | null;

  // ── Actions ──
  setJobId: (id: string | null) => void;
  setAudioFile: (file: AudioFileInfo | null) => void;
  setStep: (step: PipelineStep) => void;
  setUploadProgress: (progress: number) => void;
  setMarkdown: (markdown: string) => void;
  setCurrentTranscriptionSegment: (
    segment: TranscriptionSegment | null,
  ) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState = {
  jobId: null as string | null,
  step: "idle" as PipelineStep,
  audioFile: null as AudioFileInfo | null,
  uploadProgress: 0,
  markdown: null as string | null,
  currentTranscriptionSegment: null as TranscriptionSegment | null,
  error: null as string | null,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setJobId: (id) => set({ jobId: id }),

  setAudioFile: (file) => set({ audioFile: file, error: null }),

  setStep: (step) => set({ step }),

  setUploadProgress: (progress) => set({ uploadProgress: progress }),

  setMarkdown: (markdown) => set({ markdown, step: "done" }),

  setCurrentTranscriptionSegment: (segment) =>
    set({ currentTranscriptionSegment: segment }),

  setError: (error) => set({ error, step: "error" }),

  reset: () => set(initialState),
}));
