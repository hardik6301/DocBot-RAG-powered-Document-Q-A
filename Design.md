# DocBot — Design System (Stitch)

Source of truth: `stitch_docbot_rag_document_q_a/docbot_design_system/DESIGN.md`

## Brand

Reliable, intelligent, efficient — modern corporate minimalism. Feels like a **workspace**, not a decorative marketing site.

## Colors

| Token | Hex | Role |
|-------|-----|------|
| `background` / `surface` | `#faf8ff` | App canvas |
| `on-surface` | `#131b2e` | Primary text |
| `on-surface-variant` | `#434655` | Secondary text |
| `primary` | `#004ac6` | Brand / links |
| `primary-container` | `#2563eb` | Action Blue CTAs |
| `primary-fixed` | `#dbe1ff` | Soft blue fills |
| `outline-variant` | `#c3c6d7` | Borders |
| Ready | Emerald soft | Status |
| Processing | Amber soft | Status |
| Failed | Rose soft | Status |

## Typography

- **UI / body:** Inter
- **Labels / meta:** JetBrains Mono (`label-caps`)
- Icons: Material Symbols Outlined

## Pages

1. **Landing** — centered hero, CSS product preview, 3 steps, Free/Pro pricing, final CTA  
2. **Dashboard** — sidebar stats, dashed upload, document cards  
3. **Chat** — doc sidebar + cited chat thread  

## Motion

Short fade/rise on hero and section enter (`cubic-bezier(0.32, 0.72, 0, 1)`). Animate only `transform` / `opacity`.

## Anti-patterns

- No ezgif / canvas turntable sequences  
- No dark #121212 scrollytelling shell  
- No purple neon AI gradients  
