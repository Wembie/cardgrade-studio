import type { CenteringResult } from '@/shared/types'

// ── Grayscale conversion ──────────────────────────────────────────────────────

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b
  }
  return gray
}

// ── Rolling variance ──────────────────────────────────────────────────────────

function rollingVariance(values: number[], windowSize: number): number[] {
  const result: number[] = new Array(values.length).fill(0)
  for (let i = 0; i <= values.length - windowSize; i++) {
    let sum = 0
    let sumSq = 0
    for (let j = i; j < i + windowSize; j++) {
      sum += values[j]
      sumSq += values[j] * values[j]
    }
    const mean = sum / windowSize
    result[i + Math.floor(windowSize / 2)] = sumSq / windowSize - mean * mean
  }
  return result
}

// ── Find inner border edge on one scan line ───────────────────────────────────
//
// We scan from the edge inward. The card border (white/uniform) has low
// variance; the artwork region has high variance. We detect the transition.

function findBorderEdge(
  pixels: number[],
  threshold: number,
  fallbackThreshold: number,
  edgeBaseline: number,
): number {
  const windowSize = 5
  const variances = rollingVariance(pixels, windowSize)

  // Primary: first position where rolling variance jumps above threshold
  for (let i = windowSize; i < variances.length - windowSize; i++) {
    if (variances[i] > threshold) {
      return i
    }
  }

  // Fallback: scan for intensity change from edge baseline
  for (let i = 0; i < pixels.length; i++) {
    if (Math.abs(pixels[i] - edgeBaseline) > fallbackThreshold) {
      return i
    }
  }

  // Default: 5% of dimension if nothing found
  return Math.floor(pixels.length * 0.05)
}

// ── Single-edge measurement ───────────────────────────────────────────────────
//
// scanLines: array of pixel value arrays, each scanning inward from that edge
// Returns the average border width in pixels.

function measureEdge(
  gray: Float32Array,
  width: number,
  height: number,
  edge: 'left' | 'right' | 'top' | 'bottom',
  numScanLines: number,
  varianceThreshold: number,
): number {
  const depths: number[] = []
  const dim = edge === 'left' || edge === 'right' ? width : height
  const perpDim = edge === 'left' || edge === 'right' ? height : width

  for (let lineIdx = 0; lineIdx < numScanLines; lineIdx++) {
    // Position scan line evenly distributed, skipping 10% margins on each side
    const perpPos = Math.floor(perpDim * 0.1 + (lineIdx / (numScanLines - 1)) * perpDim * 0.8)

    const pixels: number[] = []
    for (let d = 0; d < dim; d++) {
      let grayVal: number
      if (edge === 'left') {
        grayVal = gray[perpPos * width + d]
      } else if (edge === 'right') {
        grayVal = gray[perpPos * width + (width - 1 - d)]
      } else if (edge === 'top') {
        grayVal = gray[d * width + perpPos]
      } else {
        // bottom
        grayVal = gray[(height - 1 - d) * width + perpPos]
      }
      pixels.push(grayVal)
    }

    // Compute edge baseline from first few pixels
    const baselineSamples = Math.min(10, pixels.length)
    let baselineSum = 0
    for (let k = 0; k < baselineSamples; k++) baselineSum += pixels[k]
    const edgeBaseline = baselineSum / baselineSamples

    const depth = findBorderEdge(pixels, varianceThreshold, 25, edgeBaseline)
    depths.push(depth)
  }

  // Average, discarding outliers (trim top and bottom 10%)
  depths.sort((a, b) => a - b)
  const trimCount = Math.max(1, Math.floor(depths.length * 0.1))
  const trimmed = depths.slice(trimCount, depths.length - trimCount)
  if (trimmed.length === 0) return depths[Math.floor(depths.length / 2)]
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeCentering(card: ImageData): CenteringResult {
  const { width, height, data } = card
  const gray = toGrayscale(data, width, height)

  const NUM_SCAN_LINES = 20
  const VARIANCE_THRESHOLD = 180 // card border ~uniform white; artwork has high variance

  const leftBorder = measureEdge(gray, width, height, 'left', NUM_SCAN_LINES, VARIANCE_THRESHOLD)
  const rightBorder = measureEdge(gray, width, height, 'right', NUM_SCAN_LINES, VARIANCE_THRESHOLD)
  const topBorder = measureEdge(gray, width, height, 'top', NUM_SCAN_LINES, VARIANCE_THRESHOLD)
  const bottomBorder = measureEdge(gray, width, height, 'bottom', NUM_SCAN_LINES, VARIANCE_THRESHOLD)

  // LR ratio
  const lrMin = Math.max(1, Math.min(leftBorder, rightBorder))
  const lrMax = Math.max(leftBorder, rightBorder)
  const lrRatio = lrMax / lrMin

  // TB ratio
  const tbMin = Math.max(1, Math.min(topBorder, bottomBorder))
  const tbMax = Math.max(topBorder, bottomBorder)
  const tbRatio = tbMax / tbMin

  // Percentages
  const lrTotal = leftBorder + rightBorder
  const tbTotal = topBorder + bottomBorder
  const lrPercent: [number, number] =
    lrTotal > 0
      ? [
          Math.round((leftBorder / lrTotal) * 100),
          Math.round((rightBorder / lrTotal) * 100),
        ]
      : [50, 50]
  const tbPercent: [number, number] =
    tbTotal > 0
      ? [
          Math.round((topBorder / tbTotal) * 100),
          Math.round((bottomBorder / tbTotal) * 100),
        ]
      : [50, 50]

  return {
    leftBorder,
    rightBorder,
    topBorder,
    bottomBorder,
    lrRatio,
    tbRatio,
    lrPercent,
    tbPercent,
  }
}
