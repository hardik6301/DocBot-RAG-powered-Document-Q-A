"use client";

import Icon from "@/components/ui/Icon";
import type { SpeechRecPhase } from "@/hooks/useSpeechRecognition";
import type { VoiceLatencySample } from "@/lib/latency";
import { summarizeField } from "@/lib/latency";

export type PipelinePhase = "searching" | "generating" | null;

type VoiceStatusBarProps = {
  speechPhase: SpeechRecPhase;
  pipelinePhase: PipelinePhase;
  interim?: string;
  speechError?: string | null;
  lastSample?: VoiceLatencySample | null;
  samples?: VoiceLatencySample[];
};

const PHASE_COPY: Record<
  Exclude<SpeechRecPhase, "idle"> | NonNullable<PipelinePhase>,
  { icon: string; label: string }
> = {
  listening: { icon: "mic", label: "Listening…" },
  transcribing: { icon: "graphic_eq", label: "Transcribing…" },
  searching: { icon: "manage_search", label: "Searching document…" },
  generating: { icon: "auto_awesome", label: "Generating answer…" },
};

export default function VoiceStatusBar({
  speechPhase,
  pipelinePhase,
  interim,
  speechError,
  lastSample,
  samples = [],
}: VoiceStatusBarProps) {
  const active =
    speechPhase !== "idle"
      ? speechPhase
      : pipelinePhase;

  const copy = active ? PHASE_COPY[active] : null;
  const totalSummary = summarizeField(samples, "clientTotalMs");

  if (!copy && !speechError && !lastSample) return null;

  return (
    <div className="space-y-2">
      {(copy || speechError) && (
        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-body-sm ${
            speechError
              ? "border-error/30 bg-error/5 text-error"
              : "border-primary/20 bg-primary-fixed/40 text-on-surface"
          }`}
          role="status"
          aria-live="polite"
        >
          {speechError ? (
            <>
              <Icon name="error" className="text-[18px]" />
              <span>{speechError}</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <Icon name={copy!.icon} className="text-[18px] text-primary" />
              <span className="font-medium">{copy!.label}</span>
              {interim && speechPhase !== "idle" && (
                <span className="truncate text-on-surface-variant">
                  “{interim}”
                </span>
              )}
            </>
          )}
        </div>
      )}

      {lastSample && (
        <details className="rounded-xl border border-outline-variant bg-white/80 px-3 py-2 text-[11px] text-on-surface-variant">
          <summary className="cursor-pointer select-none font-mono text-label-caps text-on-surface">
            Latency
            {totalSummary
              ? ` · P50 ${totalSummary.p50}ms · n=${totalSummary.n}`
              : ""}
          </summary>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            <Stat
              label="STT"
              value={lastSample.sttMs != null ? `${lastSample.sttMs}ms` : "—"}
            />
            <Stat label="Embed" value={`${lastSample.embedMs}ms`} />
            <Stat label="Pinecone" value={`${lastSample.pineconeMs}ms`} />
            <Stat label="Rerank" value={`${lastSample.rerankMs}ms`} />
            <Stat label="Generate" value={`${lastSample.generateMs}ms`} />
            <Stat label="Server" value={`${lastSample.totalMs}ms`} />
            <Stat label="Client total" value={`${lastSample.clientTotalMs}ms`} />
          </dl>
          {totalSummary && totalSummary.n > 1 && (
            <p className="mt-2 border-t border-outline-variant pt-2 font-mono">
              Aggregate client total — P50 {totalSummary.p50} · P70{" "}
              {totalSummary.p70} · P95 {totalSummary.p95} · max{" "}
              {totalSummary.max} ms
            </p>
          )}
        </details>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-mono text-on-surface">{value}</dd>
    </div>
  );
}
