# CardGrade Studio

> Professional trading card grading — 100% in-browser, no backend, no AI cloud, fully offline.

[![CI](https://github.com/Wembie/cardgrade-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Wembie/cardgrade-studio/actions/workflows/ci.yml)
[![CD](https://github.com/Wembie/cardgrade-studio/actions/workflows/cd.yml/badge.svg)](https://github.com/Wembie/cardgrade-studio/actions/workflows/cd.yml)
![Version](https://img.shields.io/badge/version-1.0.0-indigo)

CardGrade Studio estimates PSA, BGS, CGC, and SGC grades using classical computer vision (OpenCV.js) running entirely in the browser. No image ever leaves your device.

---

## Features

- **Card detection** — Canny edge detection + contour finding + perspective correction
- **Centering tool** — Interactive canvas with draggable L/R/T/B measurement lines; real-time ratio display
- **Surface analysis** — Grid-based whitening detection, Canny-based scratch mapping, defect heatmap overlay
- **Edge & corner analysis** — Per-edge whitening, roughness score, chip/ding detection, corner sharpness
- **Grading engine** — Heuristic scoring for PSA (1–10), BGS (1–10 with half-points), CGC (1–10), SGC (1–100); company-specific weight profiles and centering tolerances
- **Collection manager** — IndexedDB persistence via Dexie.js; scan history with PDF export (jsPDF)
- **Offline-first PWA** — Service worker caches OpenCV.js (~8 MB) and shell assets; works with no internet after first load

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, `output: 'export'`) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives) |
| Animation | Framer Motion 11 |
| State | Zustand 5 + Immer |
| Persistence | Dexie.js (IndexedDB) |
| CV | OpenCV.js 4.9.0 (lazy CDN load, Cache API) |
| PDF | jsPDF + html2canvas |
| Validation | Zod |

## Getting Started

```bash
npm install
npm run dev          # http://localhost:3000
```

### Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Static export → `out/` |
| `npm run type-check` | TypeScript type check (no emit) |
| `npm run lint` | ESLint |

## Deployment

### GitHub Pages (automatic)

Push to `main` → CD workflow builds and deploys to GitHub Pages automatically.

The `basePath` is injected at build time via `NEXT_PUBLIC_REPO_NAME` (set by the workflow from `${{ github.event.repository.name }}`).

### Manual

```bash
npm run build
# Serve the out/ directory with any static host
```

## Versioning

Version is tracked in the `VERSION` file at the repo root (plain semver, e.g. `1.0.0`).

- Read at build time by `next.config.ts` → injected as `NEXT_PUBLIC_APP_VERSION`
- Displayed in the app sidebar
- CI enforces a `VERSION` bump on every PR
- CD auto-creates a git tag (`v1.0.0`) when `VERSION` changes on `main`

To release a new version:

1. Bump `VERSION` (e.g. `1.0.1`)
2. Open a PR → CI validates the bump
3. Merge → CD tags + deploys automatically

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing / upload
│   ├── analyze/            # Main grading workspace
│   ├── collection/         # Saved scans
│   └── history/            # Grading history
├── cv/                     # OpenCV.js wrappers
│   ├── opencv-loader.ts    # Lazy CDN load + Cache API
│   ├── card-detector.ts    # Edge → contour → perspective warp
│   ├── centering-analyzer.ts
│   ├── surface-analyzer.ts
│   ├── edge-analyzer.ts
│   └── quality-checker.ts  # Blur, glare, luminance
├── features/
│   ├── analysis/           # Zustand store + pipeline hook
│   ├── centering/          # Interactive centering tool
│   ├── surface-analysis/   # Defect overlay + heatmap
│   ├── edge-analysis/      # Corner zoom + edge detail
│   ├── grading-engine/     # PSA/BGS/CGC/SGC scoring
│   └── upload/             # Drag/drop/paste zone
├── shared/
│   ├── components/         # UI primitives + layout
│   ├── lib/                # Utilities
│   └── types/              # Shared TypeScript interfaces
└── storage/                # Dexie.js schemas + repos
```

## CV Pipeline

```
Upload image
  → Quality check (blur score, glare ratio, luminance)
  → Card detection (Canny → contours → approxPolyDP → 4-corner warp)
  → Centering analysis (Sobel border detection → L/R/T/B ratios)
  → Surface analysis (grid whitening + scratch grid → defect map)
  → Edge/corner analysis (band sampling → whitening + roughness + chips)
  → Grade estimation (weighted heuristic per company)
```

## License

MIT
