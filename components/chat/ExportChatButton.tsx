"use client";

import { jsPDF } from "jspdf";
import type { StoredMessage } from "@/types";
import Icon from "@/components/ui/Icon";

type Props = {
  messages: StoredMessage[];
  title: string;
  disabled?: boolean;
};

function wrapLines(doc: jsPDF, text: string, maxWidth: number) {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

export default function ExportChatButton({
  messages,
  title,
  disabled,
}: Props) {
  const exportPdf = () => {
    const usable = messages.filter(
      (m) => m.id !== "welcome" && !("typing" in m && m.typing) && m.content,
    );
    if (usable.length === 0) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const maxW = pageW - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const heading = wrapLines(doc, `DocBot — ${title}`, maxW);
    doc.text(heading, margin, y);
    y += heading.length * 18 + 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Exported ${new Date().toLocaleString()}`, margin, y);
    y += 24;
    doc.setTextColor(0);

    for (const m of usable) {
      const label = m.role === "user" ? "You" : "DocBot";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      ensureSpace(20);
      doc.text(label, margin, y);
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = wrapLines(doc, m.content, maxW);
      for (const line of lines) {
        ensureSpace(14);
        doc.text(line, margin, y);
        y += 13;
      }

      if (m.sources?.length) {
        y += 4;
        doc.setFontSize(9);
        doc.setTextColor(80);
        for (const s of m.sources.slice(0, 3)) {
          const cite = `• ${s.filename}${s.page != null ? ` p.${s.page}` : ""}: ${s.chunkText.slice(0, 160)}…`;
          const citeLines = wrapLines(doc, cite, maxW);
          for (const line of citeLines) {
            ensureSpace(12);
            doc.text(line, margin, y);
            y += 11;
          }
        }
        doc.setTextColor(0);
      }
      y += 16;
    }

    const safe = title.replace(/[^\w.-]+/g, "_").slice(0, 40);
    doc.save(`docbot-chat-${safe || "export"}.pdf`);
  };

  return (
    <button
      type="button"
      onClick={exportPdf}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-white px-3 py-1.5 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
      title="Export chat as PDF"
    >
      <Icon name="picture_as_pdf" className="text-[18px]" />
      Export PDF
    </button>
  );
}
