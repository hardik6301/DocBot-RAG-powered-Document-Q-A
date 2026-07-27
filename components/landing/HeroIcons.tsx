/** Claymorphism 3D SVG icons matching the DocBot hero reference. */

type IconProps = { className?: string };

const softShadow = (id: string, color = "#2563EB", opacity = 0.22) => (
  <filter id={id} x="-35%" y="-20%" width="170%" height="170%">
    <feDropShadow
      dx="0"
      dy="10"
      stdDeviation="8"
      floodColor={color}
      floodOpacity={opacity}
    />
  </filter>
);

export function DocsStackIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 120" className={className} fill="none" aria-hidden>
      <defs>
        {softShadow("stackSh")}
        <linearGradient id="stackA" x1="20" y1="20" x2="100" y2="100">
          <stop stopColor="#93C5FD" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
        <linearGradient id="stackB" x1="10" y1="30" x2="90" y2="110">
          <stop stopColor="#BFDBFE" />
          <stop offset="1" stopColor="#60A5FA" />
        </linearGradient>
      </defs>
      <g filter="url(#stackSh)">
        <rect x="28" y="34" width="70" height="58" rx="12" fill="#1D4ED8" opacity="0.25" />
        <rect x="22" y="28" width="70" height="58" rx="12" fill="url(#stackA)" />
        <rect x="16" y="22" width="70" height="58" rx="12" fill="url(#stackB)" />
        <rect x="30" y="38" width="40" height="6" rx="3" fill="white" fillOpacity="0.9" />
        <rect x="30" y="50" width="32" height="6" rx="3" fill="white" fillOpacity="0.7" />
        <rect x="30" y="62" width="36" height="6" rx="3" fill="white" fillOpacity="0.55" />
      </g>
    </svg>
  );
}

export function CodeBlockIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none" aria-hidden>
      <defs>
        {softShadow("codeSh", "#1D4ED8", 0.28)}
        <linearGradient id="codeFace" x1="10" y1="8" x2="62" y2="64">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <g filter="url(#codeSh)">
        <rect x="14" y="18" width="48" height="42" rx="10" fill="#1E3A8A" opacity="0.28" />
        <rect x="10" y="12" width="48" height="42" rx="10" fill="url(#codeFace)" />
        <text
          x="34"
          y="40"
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontWeight="700"
          fontSize="18"
          fill="white"
        >
          {"{}"}
        </text>
      </g>
    </svg>
  );
}

export function SparkleIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden>
      <defs>{softShadow("sparkSh", "#3B82F6", 0.35)}</defs>
      <g filter="url(#sparkSh)">
        <path
          d="M24 2 L27.8 17.2 L44 21 L27.8 24.8 L24 40 L20.2 24.8 L4 21 L20.2 17.2 Z"
          fill="#60A5FA"
        />
        <path
          d="M24 8 L26.2 18.2 L36 21 L26.2 23.8 L24 34 L21.8 23.8 L12 21 L21.8 18.2 Z"
          fill="white"
          fillOpacity="0.35"
        />
      </g>
    </svg>
  );
}

export function MagnifierIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden>
      <defs>
        {softShadow("magSh", "#0F172A", 0.16)}
        <linearGradient id="magLens" x1="18" y1="14" x2="70" y2="70">
          <stop stopColor="#BFDBFE" />
          <stop offset="0.55" stopColor="#60A5FA" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="magHandle" x1="60" y1="60" x2="92" y2="92">
          <stop stopColor="#64748B" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>
      <g filter="url(#magSh)">
        <rect
          x="62"
          y="62"
          width="14"
          height="34"
          rx="7"
          transform="rotate(-40 62 62)"
          fill="url(#magHandle)"
        />
        <circle cx="42" cy="42" r="28" fill="#1E40AF" opacity="0.18" />
        <circle cx="40" cy="40" r="26" fill="url(#magLens)" />
        <path
          d="M26 28 C32 18 50 16 58 26 C48 22 34 28 30 38 Z"
          fill="white"
          fillOpacity="0.5"
        />
      </g>
    </svg>
  );
}

export function PdfFileIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 140 160" className={className} fill="none" aria-hidden>
      <defs>
        {softShadow("pdfSh")}
        <linearGradient id="pdfPaper" x1="20" y1="10" x2="110" y2="90">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="pdfBand" x1="18" y1="100" x2="122" y2="150">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <g filter="url(#pdfSh)">
        <path
          d="M28 18 H88 L118 48 V118 C118 126 112 132 104 132 H28 C20 132 14 126 14 118 V32 C14 24 20 18 28 18 Z"
          fill="url(#pdfPaper)"
        />
        <path d="M88 18 V40 C88 44.4 91.6 48 96 48 H118" fill="#CBD5E1" />
        <rect x="30" y="56" width="52" height="7" rx="3.5" fill="#94A3B8" />
        <rect x="30" y="70" width="40" height="7" rx="3.5" fill="#CBD5E1" />
        <rect x="14" y="100" width="104" height="42" rx="12" fill="url(#pdfBand)" />
        <text
          x="66"
          y="127"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="800"
          fontSize="20"
          fill="white"
          letterSpacing="2"
        >
          PDF
        </text>
      </g>
    </svg>
  );
}

export function DocFileIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 140 160" className={className} fill="none" aria-hidden>
      <defs>
        {softShadow("docSh")}
        <linearGradient id="docPaper" x1="20" y1="10" x2="110" y2="90">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="docBand" x1="18" y1="100" x2="122" y2="150">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <g filter="url(#docSh)">
        <path
          d="M28 18 H88 L118 48 V118 C118 126 112 132 104 132 H28 C20 132 14 126 14 118 V32 C14 24 20 18 28 18 Z"
          fill="url(#docPaper)"
        />
        <path d="M88 18 V40 C88 44.4 91.6 48 96 48 H118" fill="#CBD5E1" />
        <rect x="30" y="56" width="52" height="7" rx="3.5" fill="#94A3B8" />
        <rect x="30" y="70" width="40" height="7" rx="3.5" fill="#CBD5E1" />
        <rect x="14" y="100" width="104" height="42" rx="12" fill="url(#docBand)" />
        <text
          x="66"
          y="127"
          textAnchor="middle"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontWeight="800"
          fontSize="20"
          fill="white"
          letterSpacing="2"
        >
          DOC
        </text>
      </g>
    </svg>
  );
}

export function ChartDocIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 120 140" className={className} fill="none" aria-hidden>
      <defs>
        {softShadow("chartSh")}
        <linearGradient id="chartPaper" x1="16" y1="12" x2="100" y2="120">
          <stop stopColor="#F8FAFC" />
          <stop offset="1" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>
      <g filter="url(#chartSh)">
        <rect x="18" y="16" width="84" height="108" rx="14" fill="url(#chartPaper)" />
        <circle cx="60" cy="62" r="28" fill="#DBEAFE" />
        <path d="M60 34 A28 28 0 0 1 88 62 L60 62 Z" fill="#2563EB" />
        <path d="M60 62 L88 62 A28 28 0 0 1 70 87 Z" fill="#60A5FA" />
        <path d="M60 62 L70 87 A28 28 0 1 1 60 34 Z" fill="#93C5FD" />
        <rect x="34" y="100" width="52" height="6" rx="3" fill="#CBD5E1" />
      </g>
    </svg>
  );
}

export function SpinnerIcon3D({ className }: IconProps) {
  return (
    <svg viewBox="0 0 56 56" className={className} fill="none" aria-hidden>
      <defs>{softShadow("spinSh", "#2563EB", 0.3)}</defs>
      <g filter="url(#spinSh)">
        <circle cx="28" cy="28" r="18" stroke="#BFDBFE" strokeWidth="6" />
        <path
          d="M28 10 A18 18 0 0 1 46 28"
          stroke="#2563EB"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="28" cy="28" r="6" fill="#60A5FA" />
      </g>
    </svg>
  );
}
