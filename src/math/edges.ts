import type { EdgeResult } from '@/shared/types'

// ── Grayscale ─────────────────────────────────────────────────────────────────

function pixelGray(data: Uint8ClampedArray, idx: number): number {
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
}

// ── Statistics ────────────────────────────────────────────────────────────────

function stdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / values.length
  return Math.sqrt(variance)
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

export function analyzeEdges(card: ImageData): EdgeResult {
  const { width, height, data } = card

  const bandWidth = Math.max(3, Math.floor(Math.min(width, height) * 0.025))

  const leftValues = collectEdgeBand(data, width, height, 'left', bandWidth)
  const rightValues = collectEdgeBand(data, width, height, 'right', bandWidth)
  const topValues = collectEdgeBand(data, width, height, 'top', bandWidth)
  const bottomValues = collectEdgeBand(data, width, height, 'bottom', bandWidth)

  const leftStd = stdDev(leftValues)
  const rightStd = stdDev(rightValues)
  const topStd = stdDev(topValues)
  const bottomStd = stdDev(bottomValues)

  const leftScore = clamp(100 - leftStd * 1.8, 0, 100)
  const rightScore = clamp(100 - rightStd * 1.8, 0, 100)
  const topScore = clamp(100 - topStd * 1.8, 0, 100)
  const bottomScore = clamp(100 - bottomStd * 1.8, 0, 100)

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
