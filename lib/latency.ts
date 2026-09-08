/** Client + server RAG stage timings (ms). */

export type RagTimings = {
  embedMs: number;
  pineconeMs: number;
  rerankMs: number;
  generateMs: number;
  totalMs: number;
};

export type VoiceLatencySample = RagTimings & {
  sttMs: number | null;
  clientTotalMs: number;
  at: string;
};

export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[idx]!;
}

export function summarizeField(
  samples: VoiceLatencySample[],
  field: keyof Pick<
    VoiceLatencySample,
    | "sttMs"
    | "embedMs"
    | "pineconeMs"
    | "rerankMs"
    | "generateMs"
    | "totalMs"
    | "clientTotalMs"
  >,
): { p50: number; p70: number; p95: number; max: number; n: number } | null {
  const values = samples
    .map((s) => s[field])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  return {
    p50: percentile(values, 50),
    p70: percentile(values, 70),
    p95: percentile(values, 95),
    max: values[values.length - 1]!,
    n: values.length,
  };
}
