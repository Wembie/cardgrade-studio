import type { SurfaceResult } from '@/shared/types'

// ── Grayscale ─────────────────────────────────────────────────────────────────

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const gray = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]
  }
  return gray
}

// ── 3x3 Gaussian blur ─────────────────────────────────────────────────────────
// Kernel: [1,2,1,2,4,2,1,2,1] / 16

function gaussianBlur3x3(src: Float32Array, width: number, height: number): Float32Array {
  const dst = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      dst[idx] =
        (src[(y - 1) * width + (x - 1)] +
          2 * src[(y - 1) * width + x] +
          src[(y - 1) * width + (x + 1)] +
          2 * src[y * width + (x - 1)] +
          4 * src[y * width + x] +
          2 * src[y * width + (x + 1)] +
          src[(y + 1) * width + (x - 1)] +
          2 * src[(y + 1) * width + x] +
          src[(y + 1) * width + (x + 1)]) /
        16
    }
  }
  // Fill border pixels by copying from inside
  for (let x = 0; x < width; x++) {
    dst[x] = dst[width + x]
    dst[(height - 1) * width + x] = dst[(height - 2) * width + x]
  }
  for (let y = 0; y < height; y++) {
    dst[y * width] = dst[y * width + 1]
    dst[y * width + (width - 1)] = dst[y * width + (width - 2)]
  }
  return dst
}

// ── Sobel magnitude ───────────────────────────────────────────────────────────

function sobelMagnitude(src: Float32Array, width: number, height: number): Float32Array {
  const mag = new Float32Array(width * height)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const tl = src[(y - 1) * width + (x - 1)]
      const tc = src[(y - 1) * width + x]
      const tr = src[(y - 1) * width + (x + 1)]
      const ml = src[y * width + (x - 1)]
      const mr = src[y * width + (x + 1)]
      const bl = src[(y + 1) * width + (x - 1)]
      const bc = src[(y + 1) * width + x]
      const br = src[(y + 1) * width + (x + 1)]

      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br
      mag[y * width + x] = Math.sqrt(gx * gx + gy * gy)
    }
  }
  return mag
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

// ── Public API ────────────────────────────────────────────────────────────────

export function analyzeSurface(card: ImageData, borderPx?: number): SurfaceResult {
  const { width, height, data } = card

  const gray = toGrayscale(data, width, height)
  const blurred = gaussianBlur3x3(gray, width, height)
  const sobel = sobelMagnitude(blurred, width, height)

  const side = Math.min(width, height)
  const ringOuter = borderPx
    ? Math.max(4, Math.min(Math.floor(borderPx), Math.floor(side * 0.12)))
    : Math.floor(side * 0.08)
  const ringInner = Math.max(2, Math.floor(ringOuter * 0.5))

  // High thresholds — we only want to catch obvious physical damage,
  // not normal card texture or holo shimmer
  const SCRATCH_THRESHOLD = 90
  const HIGH_THRESHOLD    = 160

  let totalPixels = 0
  let scratchPixels = 0
  let highDefectPixels = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inRing =
        (x >= ringInner && x < ringOuter) ||
        (x >= width  - ringOuter && x < width  - ringInner) ||
        (y >= ringInner && y < ringOuter) ||
        (y >= height - ringOuter && y < height - ringInner)
      if (!inRing) continue

      const mag = sobel[y * width + x]
      totalPixels++
      if (mag > SCRATCH_THRESHOLD) scratchPixels++
      if (mag > HIGH_THRESHOLD)    highDefectPixels++
    }
  }

  const safeTotal = totalPixels || 1
  const defectDensity = scratchPixels / safeTotal

  const score = clamp(
    100 - defectDensity * 120 - (highDefectPixels / safeTotal) * 80,
    78,   // floor at NM-MT — holo/complex borders produce Sobel even on pristine cards
    100,
  )

  const scratchScore = clamp(100 - defectDensity * 180, 78, 100)

  return {
    score,
    defectDensity,
    scratchScore,
  }
}
