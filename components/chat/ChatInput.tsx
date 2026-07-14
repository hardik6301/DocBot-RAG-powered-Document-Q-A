"use client";

import { useState } from "react";
import Icon from "@/components/ui/Icon";

const prompts = [
  { icon: "summarize", label: "Summarize this" },
  { icon: "key", label: "Key points" },
  { icon: "assignment", label: "Action items" },
  { icon: "help", label: "Quiz me" },
];

type ChatInputProps = {
  onSend?: (text: string) => void;
};

export default function ChatInput({ onSend }: ChatInputProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSend?.(text);
    setValue("");
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-surface via-surface to-transparent p-stack-lg">
      <div className="mx-auto max-w-4xl space-y-stack-md">
        <div className="no-scrollbar flex gap-stack-sm overflow-x-auto pb-1">
          {prompts.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setValue(p.label)}
              className="flex shrink-0 items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-1.5 text-body-sm text-on-surface-variant transition-all hover:border-primary hover:bg-primary-fixed"
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
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              placeholder="Ask anything about this document..."
              className="max-h-32 min-h-[52px] flex-1 resize-none border-none bg-transparent px-3 py-3 text-body-md outline-none focus:ring-0"
            />
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                className="rounded-full p-2 text-outline transition-colors hover:text-primary"
                aria-label="Attach"
              >
                <Icon name="attach_file" />
              </button>
              <button
                type="button"
                onClick={submit}
                className="flex items-center justify-center rounded-xl bg-primary p-2 text-white transition-all hover:bg-surface-tint active:scale-95"
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
