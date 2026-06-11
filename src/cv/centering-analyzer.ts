import { loadOpenCV } from './opencv-loader'
import { centeringDeviationToScore } from '@/shared/lib/math'
import { ratioToString, centeringDeviation } from '@/shared/lib/utils'
import type { CenteringMeasurement, BorderMeasurement } from '@/shared/types'

/**
 * Auto-detect border widths of a (perspective-corrected) card image.
 *
 * Strategy:
 * 1. Convert to grayscale
 * 2. Sample columns/rows near each edge
 * 3. Find the dominant edge (color transition) that marks the printed border
 * 4. Measure the width in pixels
 */
export async function analyzeCentering(correctedImageData: ImageData): Promise<CenteringMeasurement> {
  const cv = await loadOpenCV()
  const { width: W, height: H } = correctedImageData

  const src = cv.matFromImageData(correctedImageData)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  try {
    const borders = detectBorders(gray, W, H, cv)
    return bordersToCentering(borders, W, H)
  } finally {
    src.delete()
    gray.delete()
  }
}

/**
 * Detect inner border edges from a grayscale card Mat.
 * Returns pixel distances from each outer edge to the inner design boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detectBorders(gray: any, W: number, H: number, cv: Awaited<ReturnType<typeof loadOpenCV>>): BorderMeasurement {
  // Apply Sobel to get vertical/horizontal edges
  const sobelX = new cv.Mat()
  const sobelY = new cv.Mat()
  cv.Sobel(gray, sobelX, cv.CV_32F, 1, 0, 3)
  cv.Sobel(gray, sobelY, cv.CV_32F, 0, 1, 3)

  try {
    // For left/right borders: analyze column-wise max Sobel-X response
    const colStrength = new Float32Array(W)
    const rowStrength = new Float32Array(H)

    const sxData = sobelX.data32F
    const syData = sobelY.data32F

    for (let y = Math.round(H * 0.1); y < Math.round(H * 0.9); y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        colStrength[x] = Math.max(colStrength[x], Math.abs(sxData[idx]))
      }
    }
    for (let x = Math.round(W * 0.1); x < Math.round(W * 0.9); x++) {
      for (let y = 0; y < H; y++) {
        const idx = y * W + x
        rowStrength[y] = Math.max(rowStrength[y], Math.abs(syData[idx]))
      }
    }

    sobelX.delete()
    sobelY.delete()

    // Find peak column strength in left region (left border) and right region
    const leftBorder = findFirstPeak(colStrength, 0, Math.floor(W * 0.3))
    const rightBorderFromRight = findFirstPeak(
      colStrength.slice().reverse(), 0, Math.floor(W * 0.3)
    )
    const rightBorder = rightBorderFromRight

    const topBorder = findFirstPeak(rowStrength, 0, Math.floor(H * 0.3))
    const bottomBorderFromBottom = findFirstPeak(
      rowStrength.slice().reverse(), 0, Math.floor(H * 0.3)
    )
    const bottomBorder = bottomBorderFromBottom

    // Sanity check: if peaks are too close to edge, use gradient descent fallback
    const safeLeft = Math.max(4, Math.min(leftBorder, Math.floor(W * 0.25)))
    const safeRight = Math.max(4, Math.min(rightBorder, Math.floor(W * 0.25)))
    const safeTop = Math.max(4, Math.min(topBorder, Math.floor(H * 0.25)))
    const safeBottom = Math.max(4, Math.min(bottomBorder, Math.floor(H * 0.25)))

    return { left: safeLeft, right: safeRight, top: safeTop, bottom: safeBottom, cardWidth: W, cardHeight: H }
  } finally {
    if (sobelX.rows !== undefined) sobelX.delete()
    if (sobelY.rows !== undefined) sobelY.delete()
  }
}

/** Find first significant peak in a signal array within [start, end] */
function findFirstPeak(signal: Float32Array | number[], start: number, end: number): number {
  const window = Array.from(signal).slice(start, end)
  const threshold = Math.max(...window) * 0.4

  // Find first position where signal crosses threshold
  let peak = Math.floor((end - start) * 0.08)  // default: 8% from edge
  for (let i = 3; i < window.length; i++) {
    if (window[i] > threshold) {
      peak = i + start
      break
    }
  }
  return peak
}

/**
 * Convert raw pixel border measurements to CenteringMeasurement.
 * This function is also called from the manual adjustment tool.
 */
export function bordersToCentering(
  borders: BorderMeasurement,
  W: number,
  H: number
): CenteringMeasurement {
  const { left, right, top, bottom } = borders
  const totalH = left + right
  const totalV = top + bottom

  const lrRatio = totalH > 0 ? left / totalH : 0.5
  const tbRatio = totalV > 0 ? top / totalV : 0.5

  const lrDev = centeringDeviation(lrRatio)
  const tbDev = centeringDeviation(tbRatio)
  const maxDev = Math.max(lrDev, tbDev)

  const score = centeringDeviationToScore(maxDev)

  let assessment: CenteringMeasurement['assessment']
  if (maxDev <= 2) assessment = 'Perfect'
  else if (maxDev <= 5) assessment = 'Excellent'
  else if (maxDev <= 10) assessment = 'Good'
  else if (maxDev <= 15) assessment = 'Fair'
  else if (maxDev <= 22) assessment = 'Poor'
  else assessment = 'Miscut'

  return {
    borders: { ...borders, cardWidth: W, cardHeight: H },
    leftRight: ratioToString(lrRatio),
    topBottom: ratioToString(tbRatio),
    lrDeviation: lrDev,
    tbDeviation: tbDev,
    score,
    assessment,
  }
}

/**
 * Recalculate centering from manual line positions (pixel values from canvas tool).
 */
export function recalculateCentering(
  leftPx: number,
  rightPx: number,
  topPx: number,
  bottomPx: number,
  cardWidth: number,
  cardHeight: number
): CenteringMeasurement {
  return bordersToCentering(
    { left: leftPx, right: cardWidth - rightPx, top: topPx, bottom: cardHeight - bottomPx, cardWidth, cardHeight },
    cardWidth,
    cardHeight
  )
}
