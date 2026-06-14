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

export function analyzeCorners(card: ImageData): CornerResult {
  const { width, height, data } = card

  const cornerSize = Math.max(8, Math.floor(Math.min(width, height) * 0.04))

  // Score based on dark-outlier rate (worn/dinged corners = darker pixels at
  // the extreme corner vs. the surrounding card border color).
  const corners: Array<'TL' | 'TR' | 'BR' | 'BL'> = ['TL', 'TR', 'BR', 'BL']
  const scores = corners.map(corner => {
    const values = sampleCorner(data, width, height, corner, cornerSize)
    if (values.length === 0) return 100
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const chipThreshold = median - 40
    const chips = values.filter(v => v < chipThreshold).length
    const chipRate = chips / values.length
    return clamp(100 - chipRate * 500, 0, 100)
  }) as [number, number, number, number]

  const avgScore = scores.reduce((a, b) => a + b, 0) / 4

  return {
    scores,
    avgScore,
  }
}
