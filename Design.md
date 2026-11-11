# Design: DocBot

The locked system. Every Hallmark run reads this first and pages share it. Change it on purpose; the file is the rule.

## System
- Genre: modern-minimal
- Shape of the first page: Workbench (Stage hero + product preview)
- Theme: brand (DocBot Stitch blues; workspace feel)
- Axes: light/grotesk-sans/cool · posture: Committed

## Brand
Reliable, intelligent, efficient — modern corporate minimalism. Feels like a **workspace**, not a decorative marketing site.

## Tokens
`app/tokens.css` is the source of truth. Roles:
```css
:root {
  --color-paper: #faf8ff; --color-paper-2: #ffffff; --color-paper-3: #f2f3ff;
  --color-ink: #131b2e; --color-ink-2: #434655; --color-muted: #737686; --color-rule: #c3c6d7;
  --color-accent: #2563eb; --color-accent-ink: #ffffff; --color-focus: #004ac6;
  --font-display: Inter, ui-sans-serif; --font-body: Inter, ui-sans-serif; --font-outlier: JetBrains Mono;
  --radius-card: 12px; --radius-pill: 999px; --rule-hair: 1px; --shadow-card: 0 10px 15px -3px rgba(19, 27, 46, 0.05);
}
```

## Controls
- Primary: fill accent · pill · min-height 48px (`.btn-primary`)
- Secondary: outline on paper · same radius and height (`.btn-quiet`)

## Motion
- Character: calm; transform/opacity only; framer-motion respects `useReducedMotion`.

## Status
- Ready: emerald soft · Processing: amber soft · Failed: rose soft

## Anti-patterns
- No ezgif / canvas turntable sequences
- No dark #121212 scrollytelling shell
- No purple neon AI gradients
- No tracked-caps / small-caps UI labels (Hallmark Floor)
- No `transition: all`

## Exports
`app/tokens.css` and `app/base.css` in this project. Tailwind maps existing semantic colors in `tailwind.config.ts`; new UI should prefer CSS variables / `.btn-*` / `.hm-label`.
