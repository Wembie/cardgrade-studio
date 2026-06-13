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

export function analyzeSurface(card: ImageData): SurfaceResult {
  const { width, height, data } = card

  const gray = toGrayscale(data, width, height)
  const blurred = gaussianBlur3x3(gray, width, height)
  const sobel = sobelMagnitude(blurred, width, height)

  // Exclude outer 8% margin
  const marginX = Math.floor(width * 0.08)
  const marginY = Math.floor(height * 0.08)

  const SCRATCH_THRESHOLD = 60
  const HIGH_THRESHOLD = 120

  let totalPixels = 0
  let scratchPixels = 0
  let highDefectPixels = 0

  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      const mag = sobel[y * width + x]
      totalPixels++
      if (mag > SCRATCH_THRESHOLD) scratchPixels++
      if (mag > HIGH_THRESHOLD) highDefectPixels++
    }
  }

  const safeTotal = totalPixels || 1
  const defectDensity = scratchPixels / safeTotal

  const score = clamp(
    100 - defectDensity * 600 - (highDefectPixels / safeTotal) * 300,
    0,
    100,
  )

  const scratchScore = clamp(100 - defectDensity * 900, 0, 100)

  return {
    score,
    defectDensity,
    scratchScore,
  }
}
