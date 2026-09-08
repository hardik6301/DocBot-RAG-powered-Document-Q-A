"use client";

type Props = {
  summary: string | null | undefined;
  keyTopics: string[] | null | undefined;
  suggestedQuestions: string[] | null | undefined;
  onAsk?: (question: string) => void;
};

export default function AiOverview({
  summary,
  keyTopics,
  suggestedQuestions,
  onAsk,
}: Props) {
  if (!summary && !(keyTopics?.length) && !(suggestedQuestions?.length)) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/15 bg-primary-fixed/40 p-4 text-on-primary-fixed">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
        AI Overview
      </p>
      {summary ? (
        <div>
          <p className="mb-1 text-body-sm font-semibold text-on-surface">
            Summary
          </p>
          <p className="text-body-sm leading-relaxed text-on-surface-variant">
            {summary}
          </p>
        </div>
      ) : null}
      {keyTopics && keyTopics.length > 0 ? (
        <div>
          <p className="mb-1.5 text-body-sm font-semibold text-on-surface">
            Key Topics
          </p>
          <div className="flex flex-wrap gap-1.5">
            {keyTopics.map((t) => (
              <span
                key={t}
                className="rounded-md bg-white/70 px-2 py-0.5 text-[11px] font-medium text-on-surface"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {suggestedQuestions && suggestedQuestions.length > 0 ? (
        <div>
          <p className="mb-1.5 text-body-sm font-semibold text-on-surface">
            Suggested Questions
          </p>
          <ul className="space-y-1.5">
            {suggestedQuestions.map((q) => (
              <li key={q}>
                <button
                  type="button"
                  onClick={() => onAsk?.(q)}
                  disabled={!onAsk}
                  className="w-full rounded-lg border border-outline-variant/80 bg-white/80 px-2.5 py-2 text-left text-[12px] leading-snug text-on-surface transition hover:border-primary/40 hover:bg-white disabled:cursor-default"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
