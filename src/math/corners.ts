import type { CornerResult } from '@/shared/types'

// ── Grayscale ─────────────────────────────────────────────────────────────────

function pixelGray(data: Uint8ClampedArray, x: number, y: number, width: number): number {
  const idx = (y * width + x) * 4
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

// ── Sample corner region ──────────────────────────────────────────────────────

function sampleCorner(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  corner: 'TL' | 'TR' | 'BR' | 'BL',
  cornerSize: number,
): number[] {
  const values: number[] = []

  let startX: number
  let startY: number

  switch (corner) {
    case 'TL':
      startX = 0
      startY = 0
      break
    case 'TR':
      startX = width - cornerSize
      startY = 0
      break
    case 'BR':
      startX = width - cornerSize
      startY = height - cornerSize
      break
    case 'BL':
      startX = 0
      startY = height - cornerSize
      break
  }

  for (let dy = 0; dy < cornerSize; dy++) {
    for (let dx = 0; dx < cornerSize; dx++) {
      const x = startX + dx
      const y = startY + dy
      if (x >= 0 && x < width && y >= 0 && y < height) {
        values.push(pixelGray(data, x, y, width))
      }
    }
  }

  return values
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeCorners(card: ImageData, cornerSizePx?: number): CornerResult {
  const { width, height, data } = card

  const cap = Math.floor(Math.min(width, height) * 0.10)
  const cornerSize = cornerSizePx
    ? Math.max(8, Math.min(Math.floor(cornerSizePx), cap))
    : Math.max(8, Math.floor(Math.min(width, height) * 0.04))

  // Cards have rounded corners — the extreme corner pixels are background (black),
  // not card material. Filter those out before scoring, otherwise every card
  // gets penalized for its own rounded corners.
  // After filtering, score based on whitening: worn corners expose white card
  // stock, making the corner brighter than the surrounding border color.
  const corners: Array<'TL' | 'TR' | 'BR' | 'BL'> = ['TL', 'TR', 'BR', 'BL']
  const scores = corners.map(corner => {
    const values = sampleCorner(data, width, height, corner, cornerSize)
    if (values.length === 0) return 100

    // Only consider card-material pixels (not dark background from rounded corners)
    const cardPixels = values.filter(v => v > 30)
    if (cardPixels.length < 4) return 85  // mostly background = small corner, assume OK

    // Histogram peak detection: artwork/full-bleed corners have no dominant brightness band.
    // If no strong peak → can't measure corner wear from photo → return NM-MT floor.
    const BUCKET = 40
    const buckets = new Array(Math.ceil(256 / BUCKET)).fill(0)
    for (const v of cardPixels) buckets[Math.min(buckets.length - 1, Math.floor(v / BUCKET))]++
    const maxBucket = Math.max(...buckets)
    if (maxBucket / cardPixels.length < 0.30) return 78

    const sorted = [...cardPixels].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]

    // Bidirectional: dark chips on light corners + bright whitening on dark corners.
    const lo = median * 0.75
    const hi = Math.min(255, median + 60)
    const chips = cardPixels.filter(v => v < lo || v > hi).length
    const chipRate = chips / cardPixels.length
    return clamp(100 - chipRate * 300, 78, 100)
  }) as [number, number, number, number]

  const avgScore = scores.reduce((a, b) => a + b, 0) / 4

  return {
    scores,
    avgScore,
  }
}
