import type { EdgeResult } from '@/shared/types'

// ── Grayscale ─────────────────────────────────────────────────────────────────

function pixelGray(data: Uint8ClampedArray, idx: number): number {
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ── Collect grayscale values in an edge band ──────────────────────────────────

function collectEdgeBand(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  edge: 'left' | 'right' | 'top' | 'bottom',
  bandWidth: number,
): number[] {
  const values: number[] = []

  if (edge === 'left') {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < bandWidth; x++) {
        values.push(pixelGray(data, (y * width + x) * 4))
      }
    }
  } else if (edge === 'right') {
    for (let y = 0; y < height; y++) {
      for (let x = width - bandWidth; x < width; x++) {
        values.push(pixelGray(data, (y * width + x) * 4))
      }
    }
  } else if (edge === 'top') {
    for (let y = 0; y < bandWidth; y++) {
      for (let x = 0; x < width; x++) {
        values.push(pixelGray(data, (y * width + x) * 4))
      }
    }
  } else {
    // bottom
    for (let y = height - bandWidth; y < height; y++) {
      for (let x = 0; x < width; x++) {
        values.push(pixelGray(data, (y * width + x) * 4))
      }
    }
  }

  return values
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeEdges(
  card: ImageData,
  bandWidths?: { left: number; right: number; top: number; bottom: number },
): EdgeResult {
  const { width, height, data } = card

  const defaultBand = Math.max(2, Math.floor(Math.min(width, height) * 0.012))
  const cap = Math.floor(Math.min(width, height) * 0.10)
  const leftBand   = bandWidths ? Math.max(2, Math.min(Math.floor(bandWidths.left),   cap)) : defaultBand
  const rightBand  = bandWidths ? Math.max(2, Math.min(Math.floor(bandWidths.right),  cap)) : defaultBand
  const topBand    = bandWidths ? Math.max(2, Math.min(Math.floor(bandWidths.top),    cap)) : defaultBand
  const bottomBand = bandWidths ? Math.max(2, Math.min(Math.floor(bandWidths.bottom), cap)) : defaultBand

  const leftValues   = collectEdgeBand(data, width, height, 'left',   leftBand)
  const rightValues  = collectEdgeBand(data, width, height, 'right',  rightBand)
  const topValues    = collectEdgeBand(data, width, height, 'top',    topBand)
  const bottomValues = collectEdgeBand(data, width, height, 'bottom', bottomBand)

  // Score = how free the edge is from defect pixels.
  // First checks for uniform border (histogram peak). Full-art cards with no
  // visible border have a flat histogram — artwork bleed, can't measure wear.
  function chipScore(values: number[]): number {
    if (values.length === 0) return 100

    // Histogram peak detection: uniform borders (white, yellow, black) cluster
    // in a narrow brightness range; artwork spreads across all buckets.
    const BUCKET = 40
    const buckets = new Array(Math.ceil(256 / BUCKET)).fill(0)
    for (const v of values) buckets[Math.min(buckets.length - 1, Math.floor(v / BUCKET))]++
    const maxBucket = Math.max(...buckets)
    // No strong peak → artwork in edge band → can't measure → return NM-MT floor
    if (maxBucket / values.length < 0.30) return 78

    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    // Bidirectional: dark chips on light borders + bright whitening on dark borders
    const lo = median * 0.75
    const hi = Math.min(255, median + 60)
    const chips = values.filter(v => v < lo || v > hi).length
    const chipRate = chips / values.length
    return clamp(100 - chipRate * 500, 78, 100)
  }

  const leftScore   = chipScore(leftValues)
  const rightScore  = chipScore(rightValues)
  const topScore    = chipScore(topValues)
  const bottomScore = chipScore(bottomValues)

  const scores: [number, number, number, number] = [leftScore, rightScore, topScore, bottomScore]
  const avgScore = (leftScore + rightScore + topScore + bottomScore) / 4

  // Chip count: from L+R edge bands, count pixels significantly darker than mean
  const lrValues = [...leftValues, ...rightValues]
  const lrMean = lrValues.reduce((a, b) => a + b, 0) / (lrValues.length || 1)
  let chipPixels = 0
  for (const v of lrValues) {
    if (v < lrMean - 50) chipPixels++
  }
  const chipCount = Math.floor(chipPixels / 8)

  return {
    scores,
    avgScore,
    chipCount,
  }
}
