import type { Point, Rect } from '@/shared/types'

export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

export function angle(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI)
}

export function rectArea(r: Rect): number {
  return r.width * r.height
}

export function pointInRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
}

export function scaleRect(r: Rect, scale: number): Rect {
  return { x: r.x * scale, y: r.y * scale, width: r.width * scale, height: r.height * scale }
}

export function padRect(r: Rect, padding: number): Rect {
  return {
    x: r.x - padding,
    y: r.y - padding,
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  }
}

/** Sort 4 corner points into [TL, TR, BR, BL] order */
export function sortCorners(pts: Point[]): [Point, Point, Point, Point] {
  const center = {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
  const withAngle = pts.map((p) => ({
    ...p,
    a: Math.atan2(p.y - center.y, p.x - center.x),
  }))
  withAngle.sort((a, b) => a.a - b.a)
  // After sort by angle: right, bottom-right, bottom-left, left — need TL,TR,BR,BL
  const byY = [...pts].sort((a, b) => a.y - b.y)
  const top = byY.slice(0, 2).sort((a, b) => a.x - b.x)
  const bot = byY.slice(2, 4).sort((a, b) => a.x - b.x)
  return [top[0], top[1], bot[1], bot[0]]
}

/** Convert centering deviation (0–50) to a 0–10 sub-score */
export function centeringDeviationToScore(deviation: number): number {
  // 0 dev  = 10.0
  // 5 dev  = 9.5  (60/40 range)
  // 10 dev = 8.5
  // 15 dev = 7.0
  // 20 dev = 5.0
  // 25 dev = 3.0
  // 30 dev = 1.5
  // 35+    = 0
  if (deviation <= 1) return 10
  if (deviation <= 5) return 10 - (deviation - 1) * 0.1
  if (deviation <= 10) return 9.5 - (deviation - 5) * 0.2
  if (deviation <= 15) return 8.5 - (deviation - 10) * 0.3
  if (deviation <= 20) return 7.0 - (deviation - 15) * 0.4
  if (deviation <= 25) return 5.0 - (deviation - 20) * 0.4
  if (deviation <= 30) return 3.0 - (deviation - 25) * 0.3
  return Math.max(0, 1.5 - (deviation - 30) * 0.15)
}

/** Gaussian kernel for blur detection */
export function laplacianVariance(pixels: Uint8ClampedArray, w: number, h: number): number {
  // Laplacian kernel: 0,1,0 / 1,-4,1 / 0,1,0
  let sum = 0
  let sumSq = 0
  let count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
      const top = pixels[((y - 1) * w + x) * 4]
      const bot = pixels[((y + 1) * w + x) * 4]
      const left = pixels[(y * w + x - 1) * 4]
      const right = pixels[(y * w + x + 1) * 4]
      const lap = gray - (top * 0.25 + bot * 0.25 + left * 0.25 + right * 0.25)
      sum += lap
      sumSq += lap * lap
      count++
    }
  }
  const mean = sum / count
  return (sumSq / count) - mean * mean
}

/** Compute brightness as mean luminance 0–1 */
export function meanLuminance(pixels: Uint8ClampedArray): number {
  let sum = 0
  const total = pixels.length / 4
  for (let i = 0; i < pixels.length; i += 4) {
    sum += pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
  }
  return sum / total / 255
}

/** Compute standard deviation of luminance (contrast proxy) */
export function luminanceStdDev(pixels: Uint8ClampedArray): number {
  const total = pixels.length / 4
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
    sum += lum
    sumSq += lum * lum
  }
  const mean = sum / total
  return Math.sqrt(sumSq / total - mean * mean)
}

/** Detect glare: % of pixels above 250 brightness */
export function glareRatio(pixels: Uint8ClampedArray): number {
  let bright = 0
  const total = pixels.length / 4
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
    if (lum > 250) bright++
  }
  return bright / total
}

/** Compute histogram (256 bins) of grayscale values */
export function grayscaleHistogram(pixels: Uint8ClampedArray): number[] {
  const hist = new Array(256).fill(0)
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    hist[lum]++
  }
  return hist
}

/** Normalize histogram to 0–1 */
export function normalizeHistogram(hist: number[]): number[] {
  const max = Math.max(...hist)
  return max > 0 ? hist.map((v) => v / max) : hist
}

/** Sample a rectangular region from ImageData */
export function cropImageData(src: ImageData, region: Rect): ImageData {
  const canvas = new OffscreenCanvas(region.width, region.height)
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(src, -region.x, -region.y)
  return ctx.getImageData(0, 0, region.width, region.height)
}

/** Bilinear interpolation for subpixel sampling */
export function sampleBilinear(pixels: Uint8ClampedArray, w: number, x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(x0 + 1, w - 1)
  const y1 = y0 + 1
  const tx = x - x0
  const ty = y - y0
  const i00 = (y0 * w + x0) * 4
  const i10 = (y0 * w + x1) * 4
  const i01 = (y1 * w + x0) * 4
  const i11 = (y1 * w + x1) * 4
  return (
    pixels[i00] * (1 - tx) * (1 - ty) +
    pixels[i10] * tx * (1 - ty) +
    pixels[i01] * (1 - tx) * ty +
    pixels[i11] * tx * ty
  )
}
