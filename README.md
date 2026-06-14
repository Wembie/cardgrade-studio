# CardGrade Studio

> Professional trading card grading — mathematical precision, zero AI, runs entirely in your browser.

[![CI](https://github.com/Wembie/cardgrade-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Wembie/cardgrade-studio/actions/workflows/ci.yml)
[![CD](https://github.com/Wembie/cardgrade-studio/actions/workflows/cd.yml/badge.svg)](https://github.com/Wembie/cardgrade-studio/actions/workflows/cd.yml)
![Version](https://img.shields.io/badge/version-1.0.4-indigo)

CardGrade Studio estimates PSA, BGS, CGC, and SGC grades using pure mathematical analysis running entirely in the browser. No image ever leaves your device.

---

## How It Works

1. **Upload** — Drop a clear photo of your card
2. **Align** — Drag four corner handles to match the card edges exactly; a built-in level indicator shows tilt angle
3. **Analyze** — Click Analyze; results appear instantly

## Features

- **Perspective warp** — DLT homography (8×8 linear system, Gaussian elimination) maps your card to a standard 500×700 rectangle
- **Centering measurement** — Rolling-variance border scan detects the artwork edge on all four sides; computes L/R and T/B ratios
- **Surface analysis** — Grayscale → Gaussian blur → Sobel magnitude; scratch and defect density scoring
- **Edge analysis** — Per-edge std-dev scoring, chip count estimation
- **Corner analysis** — Per-corner variance scoring
- **Grading engine** — Company-specific weight profiles and threshold tables for PSA (1–10), BGS (1–10 with half-points + Black Label), CGC (1–10 with half-points), SGC (1–10 with half-points)
- **Level indicator** — Computes card tilt from corner positions; displays bubble-level UI
- **PWA** — Service worker caches app shell; works offline after first load

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, `output: 'export'`) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v3 + shadcn/ui (Radix primitives) |
| Animation | Framer Motion 11 |
| Math | Pure JS + Canvas API (no OpenCV) |
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

`basePath` is injected at build time via `NEXT_PUBLIC_REPO_NAME` (set by the workflow).

### Manual

```bash
npm run build
# Serve the out/ directory with any static host
```

## Versioning

Version lives in the `VERSION` file (plain semver). CI enforces a bump on every PR. CD auto-tags and deploys on merge to `main`.

## Project Structure

```
src/
├── app/
│   ├── page.tsx            # Marketing landing page
│   └── analyze/            # Card grading workspace
├── math/                   # Pure JS math engine (no dependencies)
│   ├── perspective.ts      # DLT homography + inverse warp
│   ├── centering.ts        # Border detection → L/R/T/B ratios
│   ├── surface.ts          # Sobel surface analysis
│   ├── edges.ts            # Edge band scoring
│   ├── corners.ts          # Corner region scoring
│   └── grading.ts          # PSA / BGS / CGC / SGC formulas
├── features/
│   └── analyzer/           # Upload, border adjuster, level, results
├── shared/
│   ├── components/         # UI primitives + layout
│   ├── lib/                # Utilities
│   └── types/              # Shared TypeScript interfaces
public/
├── sw.js                   # Service worker (app shell cache)
└── manifest.json           # PWA manifest
```

## Analysis Pipeline

```
Upload image
  → User positions 4 corner handles
  → warpPerspective (DLT homography → 500×700 ImageData)
  → analyzeCentering (rolling-variance border scan)
  → analyzeSurface   (Gaussian blur → Sobel → defect density)
  → analyzeEdges     (band std-dev → per-edge score)
  → analyzeCorners   (region std-dev → per-corner score)
  → estimateGrades   (weighted formulas → PSA / BGS / CGC / SGC)
```

## License

MIT
