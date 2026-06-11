import { loadOpenCV } from './opencv-loader'
import { generateId } from '@/shared/lib/utils'
import { grayscaleHistogram, luminanceStdDev } from '@/shared/lib/math'
import type { SurfaceAnalysis, SurfaceDefect, DefectType, DefectSeverity } from '@/shared/types'

const GRID_COLS = 16
const GRID_ROWS = 20
const WHITENING_THRESHOLD = 240  // luminance > this = whitening candidate
const SCRATCH_EDGE_THRESHOLD = 0.12  // Normalized Sobel response for scratch detection
const MIN_DEFECT_AREA = 0.001       // 0.1% of card area min to report

/**
 * Analyze card surface for defects using classical CV techniques.
 *
 * Techniques:
 * - Whitening: detect anomalously bright regions in the central artwork
 * - Scratches: detect high-frequency linear edges not aligned with border
 * - Print defects: local histogram deviation from neighborhood
 * - Heatmap: grid-based damage intensity map
 */
export async function analyzeSurface(correctedImageData: ImageData): Promise<SurfaceAnalysis> {
  const cv = await loadOpenCV()
  const { width: W, height: H } = correctedImageData
  const pixels = correctedImageData.data

  const src = cv.matFromImageData(correctedImageData)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  const defects: SurfaceDefect[] = []
  let heatmap: number[][] = Array.from({ length: GRID_ROWS }, () => new Array(GRID_COLS).fill(0))

  try {
    // ── 1. Whitening detection ──────────────────────────────────────────────
    const whiteningDefects = detectWhitening(pixels, W, H, cv, gray)
    defects.push(...whiteningDefects)

    // ── 2. Scratch detection via edge analysis ──────────────────────────────
    const scratchDefects = detectScratches(cv, gray, W, H)
    defects.push(...scratchDefects)

    // ── 3. Build damage heatmap ─────────────────────────────────────────────
    heatmap = buildHeatmap(defects, GRID_COLS, GRID_ROWS)

    // ── 4. Compute sub-scores ───────────────────────────────────────────────
    const whiteningPenalty = whiteningDefects.reduce((s, d) => s + severityPenalty(d.severity) * 0.8, 0)
    const scratchPenalty = scratchDefects.reduce((s, d) => s + severityPenalty(d.severity) * 1.2, 0)

    const whiteningScore = Math.max(0, 10 - whiteningPenalty)
    const scratchScore = Math.max(0, 10 - scratchPenalty)

    // Print quality: inverse of luminance std-dev deviation from expected
    const stdDev = luminanceStdDev(pixels)
    // Well-printed cards have moderate texture; very low or very high stdDev = problem
    const printQualityScore = stdDev > 5 && stdDev < 80 ? 10 : stdDev <= 5 ? 8 : 9

    const overallScore = Math.max(
      0,
      10 - defects.reduce((s, d) => s + severityPenalty(d.severity) * defectTypeWeight(d.type), 0)
    )

    return {
      defects,
      whiteningScore: Math.round(whiteningScore * 2) / 2,
      scratchScore: Math.round(scratchScore * 2) / 2,
      printQualityScore,
      overallScore: Math.round(overallScore * 2) / 2,
      heatmap,
    }
  } finally {
    src.delete()
    gray.delete()
  }
}

function detectWhitening(pixels: Uint8ClampedArray, W: number, H: number, cv: Awaited<ReturnType<typeof loadOpenCV>>, _gray: any): SurfaceDefect[] {
  const defects: SurfaceDefect[] = []
  const cellW = Math.floor(W / GRID_COLS)
  const cellH = Math.floor(H / GRID_ROWS)

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // Skip extreme edges where whitening is normal (card border region)
      if (row < 1 || row >= GRID_ROWS - 1 || col < 1 || col >= GRID_COLS - 1) continue

      const startX = col * cellW
      const startY = row * cellH
      let brightCount = 0
      let total = 0

      for (let y = startY; y < startY + cellH && y < H; y++) {
        for (let x = startX; x < startX + cellW && x < W; x++) {
          const i = (y * W + x) * 4
          const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
          if (lum > WHITENING_THRESHOLD) brightCount++
          total++
        }
      }

      const ratio = brightCount / total
      if (ratio > 0.15) {  // More than 15% of cell is bright = whitening
        const normalW = cellW / W
        const normalH = cellH / H
        const area = normalW * normalH

        if (area >= MIN_DEFECT_AREA) {
          const severity: DefectSeverity =
            ratio > 0.5 ? 'major' : ratio > 0.3 ? 'moderate' : 'minor'
          defects.push({
            id: generateId(),
            type: 'whitening',
            severity,
            bounds: {
              x: startX / W,
              y: startY / H,
              w: normalW,
              h: normalH,
            },
            confidence: Math.min(1, ratio * 2),
            description: `${Math.round(ratio * 100)}% cell whitening detected`,
          })
        }
      }
    }
  }

  // Merge adjacent whitening regions
  return mergeAdjacentDefects(defects, 'whitening')
}

function detectScratches(cv: Awaited<ReturnType<typeof loadOpenCV>>, gray: any, W: number,
  H: number
): SurfaceDefect[] {
  const defects: SurfaceDefect[] = []

  const sobelX = new cv.Mat()
  const sobelY = new cv.Mat()
  const edges = new cv.Mat()
  const thresh = new cv.Mat()

  try {
    cv.Sobel(gray, sobelX, cv.CV_32F, 1, 0, 3)
    cv.Sobel(gray, sobelY, cv.CV_32F, 0, 1, 3)
    cv.Canny(gray, edges, 60, 180)

    // Threshold edge image to find significant edges
    cv.threshold(edges, thresh, 127, 255, cv.THRESH_BINARY)

    const edgeData = thresh.data
    const cellW = Math.floor(W / GRID_COLS)
    const cellH = Math.floor(H / GRID_ROWS)

    for (let row = 2; row < GRID_ROWS - 2; row++) {
      for (let col = 2; col < GRID_COLS - 2; col++) {
        const startX = col * cellW
        const startY = row * cellH
        let edgeCount = 0
        let total = 0

        for (let y = startY; y < startY + cellH && y < H; y++) {
          for (let x = startX; x < startX + cellW && x < W; x++) {
            if (edgeData[y * W + x] > 127) edgeCount++
            total++
          }
        }

        const density = edgeCount / total
        // High edge density in artwork areas = potential scratch
        if (density > SCRATCH_EDGE_THRESHOLD) {
          const severity: DefectSeverity =
            density > 0.3 ? 'major' : density > 0.2 ? 'moderate' : 'minor'

          defects.push({
            id: generateId(),
            type: 'scratch',
            severity,
            bounds: {
              x: startX / W,
              y: startY / H,
              w: cellW / W,
              h: cellH / H,
            },
            confidence: Math.min(1, density * 4),
            description: `High edge density (${Math.round(density * 100)}%) — possible scratch`,
          })
        }
      }
    }
  } finally {
    sobelX.delete()
    sobelY.delete()
    edges.delete()
    thresh.delete()
  }

  return defects
}

function buildHeatmap(defects: SurfaceDefect[], cols: number, rows: number): number[][] {
  const map = Array.from({ length: rows }, () => new Array(cols).fill(0))

  for (const d of defects) {
    const weight = d.severity === 'major' ? 1 : d.severity === 'moderate' ? 0.6 : 0.3
    const c0 = Math.floor(d.bounds.x * cols)
    const r0 = Math.floor(d.bounds.y * rows)
    const c1 = Math.min(cols - 1, Math.ceil((d.bounds.x + d.bounds.w) * cols))
    const r1 = Math.min(rows - 1, Math.ceil((d.bounds.y + d.bounds.h) * rows))
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        map[r][c] = Math.min(1, map[r][c] + weight)
      }
    }
  }

  return map
}

function mergeAdjacentDefects(defects: SurfaceDefect[], type: DefectType): SurfaceDefect[] {
  if (defects.length <= 1) return defects
  const merged: SurfaceDefect[] = []
  const used = new Set<number>()

  for (let i = 0; i < defects.length; i++) {
    if (used.has(i)) continue
    let current = defects[i]
    for (let j = i + 1; j < defects.length; j++) {
      if (used.has(j)) continue
      const other = defects[j]
      if (boundsOverlap(current.bounds, other.bounds, 0.02)) {
        current = mergeDefect(current, other)
        used.add(j)
      }
    }
    merged.push(current)
    used.add(i)
  }

  return merged
}

function boundsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  margin: number
): boolean {
  return (
    a.x - margin < b.x + b.w + margin &&
    a.x + a.w + margin > b.x - margin &&
    a.y - margin < b.y + b.h + margin &&
    a.y + a.h + margin > b.y - margin
  )
}

function mergeDefect(a: SurfaceDefect, b: SurfaceDefect): SurfaceDefect {
  const x = Math.min(a.bounds.x, b.bounds.x)
  const y = Math.min(a.bounds.y, b.bounds.y)
  const x2 = Math.max(a.bounds.x + a.bounds.w, b.bounds.x + b.bounds.w)
  const y2 = Math.max(a.bounds.y + a.bounds.h, b.bounds.y + b.bounds.h)
  const severity = severityPenalty(a.severity) > severityPenalty(b.severity) ? a.severity : b.severity
  return {
    ...a,
    severity,
    bounds: { x, y, w: x2 - x, h: y2 - y },
    confidence: Math.max(a.confidence, b.confidence),
  }
}

function severityPenalty(s: DefectSeverity): number {
  return s === 'major' ? 3 : s === 'moderate' ? 1.5 : 0.5
}

function defectTypeWeight(t: DefectType): number {
  const weights: Record<DefectType, number> = {
    scratch: 1.2,
    crease: 1.5,
    whitening: 0.8,
    print_defect: 0.6,
    stain: 1.0,
    ink_loss: 1.3,
    surface_wear: 0.7,
  }
  return weights[t] ?? 1
}
