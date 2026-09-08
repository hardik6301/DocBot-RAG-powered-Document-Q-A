"use client";

import { useCallback, useState } from "react";
import Icon from "@/components/ui/Icon";
import VoiceStatusBar, {
  type PipelinePhase,
} from "@/components/chat/VoiceStatusBar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { VoiceLatencySample } from "@/lib/latency";

const prompts = [
  { icon: "summarize", label: "Summarize this" },
  { icon: "key", label: "Key points" },
  { icon: "assignment", label: "Action items" },
  { icon: "help", label: "Quiz me" },
];

export type ChatSendMeta = {
  source: "typed" | "voice";
  sttMs?: number;
};

type ChatInputProps = {
  onSend?: (text: string, meta?: ChatSendMeta) => void;
  disabled?: boolean;
  placeholder?: string;
  pipelinePhase?: PipelinePhase;
  lastSample?: VoiceLatencySample | null;
  samples?: VoiceLatencySample[];
};

export default function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask DocBot anything about this document...",
  pipelinePhase = null,
  lastSample = null,
  samples = [],
}: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleVoiceFinal = useCallback(
    (transcript: string, sttMs: number) => {
      if (disabled) return;
      const text = transcript.trim();
      if (!text) return;
      setValue("");
      onSend?.(text, { source: "voice", sttMs });
    },
    [disabled, onSend],
  );

  const {
    supported: micSupported,
    phase: speechPhase,
    error: speechError,
    interim,
    toggle: toggleMic,
  } = useSpeechRecognition({ onFinal: handleVoiceFinal });

  const submit = () => {
    if (disabled) return;
    const text = value.trim();
    if (!text) return;
    onSend?.(text, { source: "typed" });
    setValue("");
  };

  const busy =
    disabled ||
    speechPhase === "listening" ||
    speechPhase === "transcribing" ||
    pipelinePhase != null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface to-transparent p-stack-lg">
      <div className="mx-auto max-w-4xl space-y-stack-md">
        <VoiceStatusBar
          speechPhase={speechPhase}
          pipelinePhase={pipelinePhase}
          interim={interim}
          speechError={speechError}
          lastSample={lastSample}
          samples={samples}
        />

        <div className="no-scrollbar flex gap-stack-sm overflow-x-auto pb-1">
          {prompts.map((p) => (
            <button
              key={p.label}
              type="button"
              disabled={busy}
              onClick={() => setValue(p.label)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-1.5 text-body-sm text-on-surface-variant transition-all hover:border-primary hover:bg-primary-fixed disabled:opacity-50"
            >
              <Icon name={p.icon} className="text-[18px]" />
              {p.label}
            </button>
          ))}
        </div>

        <div className="group relative">
          <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-primary to-surface-tint opacity-10 blur transition-opacity group-focus-within:opacity-30" />
          <div className="relative flex items-end rounded-2xl border border-outline-variant bg-white p-2 shadow-xl transition-all group-focus-within:border-primary">
            <textarea
              value={
                speechPhase !== "idle" && interim
                  ? interim
                  : value
              }
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              disabled={busy}
              placeholder={
                speechPhase === "listening"
                  ? "Listening… tap the mic when done"
                  : placeholder
              }
              className="max-h-32 min-h-[52px] flex-1 resize-none border-none bg-transparent px-3 py-3 text-body-md outline-none focus:ring-0 disabled:opacity-50"
            />
            <div className="flex items-center gap-2 p-2">
              {micSupported && (
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={disabled || pipelinePhase != null}
                  className={`rounded-full p-2 transition-colors disabled:opacity-50 ${
                    speechPhase === "listening" ||
                    speechPhase === "transcribing"
                      ? "bg-error/10 text-error"
                      : "text-outline hover:text-primary"
                  }`}
                  aria-label={
                    speechPhase === "listening"
                      ? "Stop listening"
                      : "Ask with voice"
                  }
                  title={
                    speechPhase === "listening"
                      ? "Stop listening"
                      : "Ask with voice"
                  }
                >
                  <Icon
                    name={
                      speechPhase === "listening" ||
                      speechPhase === "transcribing"
                        ? "stop_circle"
                        : "mic"
                    }
                  />
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={busy || !value.trim()}
                className="flex items-center justify-center rounded-xl bg-primary p-2 text-white transition-all hover:bg-surface-tint active:scale-95 disabled:opacity-50"
                aria-label="Send"
              >
                <Icon name="arrow_upward" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[11px] text-outline">
          DocBot can make mistakes. Verify important information from the cited
          sources.
        </p>
      </div>
    </div>
  );
}
