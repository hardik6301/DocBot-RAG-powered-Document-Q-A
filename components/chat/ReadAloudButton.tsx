"use client";

import Icon from "@/components/ui/Icon";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

type ReadAloudButtonProps = {
  text: string;
};

export default function ReadAloudButton({ text }: ReadAloudButtonProps) {
  const { supported, speaking, toggle, stop } = useSpeechSynthesis();

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : toggle(text))}
      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container px-2.5 py-1 text-[11px] font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
      aria-label={speaking ? "Stop reading" : "Read aloud"}
    >
      <Icon
        name={speaking ? "stop_circle" : "volume_up"}
        className="text-[16px]"
      />
      {speaking ? "Stop" : "Read aloud"}
    </button>
  );
}
