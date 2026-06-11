import { loadOpenCV } from './opencv-loader'
import { sortCorners } from '@/shared/lib/math'
import type { CardBounds, Point } from '@/shared/types'

const CARD_ASPECT_RATIO = 63 / 88    // Standard TCG card
const ASPECT_TOLERANCE = 0.25        // Allow ±25% deviation
const MIN_AREA_FRACTION = 0.1        // Card must be ≥10% of image
const TARGET_LONG_SIDE = 800         // Resize for performance

/**
 * Detect the card in an image and return its bounds + corrected image data.
 * Falls back to a full-image rectangle if detection fails.
 */
export async function detectCard(imageData: ImageData): Promise<{
  bounds: CardBounds
  correctedImageData: ImageData | null
}> {
  const cv = await loadOpenCV()

  const src = cv.matFromImageData(imageData)
  const origW = imageData.width
  const origH = imageData.height

  // Scale down for performance, record scale factor
  const scale = Math.min(1, TARGET_LONG_SIDE / Math.max(origW, origH))
  let working = new cv.Mat()
  if (scale < 1) {
    cv.resize(src, working, new cv.Size(Math.round(origW * scale), Math.round(origH * scale)))
  } else {
    src.copyTo(working)
  }

  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const edges = new cv.Mat()
  const dilated = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {
    cv.cvtColor(working, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)
    cv.Canny(blurred, edges, 40, 120)
    cv.dilate(edges, dilated, kernel)

    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const wArea = working.cols * working.rows
    let best: { corners: Point[]; area: number; confidence: number } | null = null
    let bestScore = 0

    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const area = cv.contourArea(cnt)

      if (area < wArea * MIN_AREA_FRACTION) continue

      const approx = new cv.Mat()
      const eps = 0.02 * cv.arcLength(cnt, true)
      cv.approxPolyDP(cnt, approx, eps, true)

      let pts: Point[] = []
      if (approx.rows === 4) {
        for (let j = 0; j < 4; j++) {
          pts.push({ x: approx.data32S[j * 2], y: approx.data32S[j * 2 + 1] })
        }
      } else if (approx.rows > 4) {
        // Try to reduce to 4 via hull
        const hull = new cv.Mat()
        cv.convexHull(cnt, hull)
        const hullApprox = new cv.Mat()
        const hullEps = 0.03 * cv.arcLength(hull, true)
        cv.approxPolyDP(hull, hullApprox, hullEps, true)
        if (hullApprox.rows === 4) {
          for (let j = 0; j < 4; j++) {
            pts.push({ x: hullApprox.data32S[j * 2], y: hullApprox.data32S[j * 2 + 1] })
          }
        }
        hull.delete()
        hullApprox.delete()
      }

      approx.delete()

      if (pts.length !== 4) continue

      // Score based on area + aspect ratio similarity to standard card
      const sorted = sortCorners(pts)
      const w1 = Math.hypot(sorted[1].x - sorted[0].x, sorted[1].y - sorted[0].y)
      const w2 = Math.hypot(sorted[2].x - sorted[3].x, sorted[2].y - sorted[3].y)
      const h1 = Math.hypot(sorted[3].x - sorted[0].x, sorted[3].y - sorted[0].y)
      const h2 = Math.hypot(sorted[2].x - sorted[1].x, sorted[2].y - sorted[1].y)
      const W = (w1 + w2) / 2
      const H = (h1 + h2) / 2
      const aspectRatio = Math.min(W, H) / Math.max(W, H)
      const aspectDiff = Math.abs(aspectRatio - CARD_ASPECT_RATIO)
      if (aspectDiff > ASPECT_TOLERANCE) continue

      const areaScore = area / wArea
      const aspectScore = 1 - aspectDiff / ASPECT_TOLERANCE
      const score = areaScore * 0.5 + aspectScore * 0.5
      const confidence = Math.min(1, areaScore * 1.5) * aspectScore

      if (score > bestScore) {
        bestScore = score
        best = { corners: sorted, area, confidence }
      }
    }

    // Fallback: use full image
    if (!best) {
      const margin = Math.min(origW, origH) * 0.02
      const fallbackCorners: [Point, Point, Point, Point] = [
        { x: margin, y: margin },
        { x: origW - margin, y: margin },
        { x: origW - margin, y: origH - margin },
        { x: margin, y: origH - margin },
      ]
      const bounds: CardBounds = {
        rect: { x: 0, y: 0, width: origW, height: origH },
        corners: fallbackCorners,
        angle: 0,
        confidence: 0.3,
      }
      return { bounds, correctedImageData: null }
    }

    // Scale corners back to original resolution
    const invScale = 1 / scale
    const scaledCorners = best.corners.map((p) => ({
      x: p.x * invScale,
      y: p.y * invScale,
    })) as [Point, Point, Point, Point]

    // Calculate rotation angle from top edge
    const topAngle = Math.atan2(
      scaledCorners[1].y - scaledCorners[0].y,
      scaledCorners[1].x - scaledCorners[0].x
    ) * (180 / Math.PI)

    const bRect = cv.boundingRect(contours.get(
      [...Array(contours.size()).keys()].reduce((bestIdx, i) =>
        cv.contourArea(contours.get(i)) > cv.contourArea(contours.get(bestIdx)) ? i : bestIdx, 0
      )
    ))

    const bounds: CardBounds = {
      rect: {
        x: bRect.x * invScale,
        y: bRect.y * invScale,
        width: bRect.width * invScale,
        height: bRect.height * invScale,
      },
      corners: scaledCorners,
      angle: topAngle,
      confidence: best.confidence,
    }

    // Perform perspective correction
    const corrected = await perspectiveCorrect(imageData, scaledCorners)

    return { bounds, correctedImageData: corrected }
  } finally {
    src.delete()
    working.delete()
    gray.delete()
    blurred.delete()
    edges.delete()
    dilated.delete()
    kernel.delete()
    contours.delete()
    hierarchy.delete()
  }
}

/**
 * Warp a quadrilateral region to a flat rectangle using perspective transform.
 * Tries OpenCV warpPerspective first, falls back to canvas bilinear warp.
 */
export async function perspectiveCorrect(
  imageData: ImageData,
  corners: [Point, Point, Point, Point]
): Promise<ImageData> {
  const topW = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y)
  const botW = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y)
  const leftH = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y)
  const rightH = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y)
  const outW = Math.round(Math.max(topW, botW))
  const outH = Math.round(Math.max(leftH, rightH))

  try {
    const { warpPerspectiveWithPoints } = await import('./perspective-warp')
    return await warpPerspectiveWithPoints(imageData, corners, outW, outH)
  } catch {
    return canvasPerspectiveWarp(imageData, corners, outW, outH)
  }
}

/** Canvas-based perspective correction (no OpenCV dependency) */
function canvasPerspectiveWarp(
  imageData: ImageData,
  corners: [Point, Point, Point, Point],
  outW: number,
  outH: number
): ImageData {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height)
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)

  const outCanvas = new OffscreenCanvas(outW, outH)
  const outCtx = outCanvas.getContext('2d')!

  // Simple bilinear quad-to-rect mapping
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const u = x / outW
      const v = y / outH
      // Bilinear interpolation of source coords
      const srcX =
        corners[0].x * (1 - u) * (1 - v) +
        corners[1].x * u * (1 - v) +
        corners[3].x * (1 - u) * v +
        corners[2].x * u * v
      const srcY =
        corners[0].y * (1 - u) * (1 - v) +
        corners[1].y * u * (1 - v) +
        corners[3].y * (1 - u) * v +
        corners[2].y * u * v

      const sx = Math.round(srcX)
      const sy = Math.round(srcY)
      const i = (sy * imageData.width + sx) * 4
      const r = imageData.data[i]
      const g = imageData.data[i + 1]
      const b = imageData.data[i + 2]
      const a = imageData.data[i + 3]

      outCtx.fillStyle = `rgba(${r},${g},${b},${a / 255})`
      outCtx.fillRect(x, y, 1, 1)
    }
  }

  return outCtx.getImageData(0, 0, outW, outH)
}
