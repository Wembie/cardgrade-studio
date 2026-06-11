import { loadOpenCV } from './opencv-loader'
import type { EdgeAnalysis, EdgeCondition, CornerCondition, EdgeSide, CornerPosition } from '@/shared/types'

const EDGE_SAMPLE_DEPTH = 0.06    // Sample 6% depth from each edge
const CORNER_REGION = 0.12        // 12% of card dimensions for corner analysis
const WHITENING_LUMA = 230        // Pixel brightness considered "whitening"

/**
 * Analyze edges and corners of a corrected card image for grading purposes.
 */
export async function analyzeEdges(correctedImageData: ImageData): Promise<EdgeAnalysis> {
  const cv = await loadOpenCV()
  const { width: W, height: H } = correctedImageData
  const pixels = correctedImageData.data

  const src = cv.matFromImageData(correctedImageData)
  const gray = new cv.Mat()
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

  try {
    const edgeDepthW = Math.max(4, Math.round(W * EDGE_SAMPLE_DEPTH))
    const edgeDepthH = Math.max(4, Math.round(H * EDGE_SAMPLE_DEPTH))
    const cornerW = Math.round(W * CORNER_REGION)
    const cornerH = Math.round(H * CORNER_REGION)

    // ── Edges ─────────────────────────────────────────────────────────────
    const topEdge = analyzeEdgeBand(pixels, W, H, 'top', edgeDepthH)
    const bottomEdge = analyzeEdgeBand(pixels, W, H, 'bottom', edgeDepthH)
    const leftEdge = analyzeEdgeBand(pixels, W, H, 'left', edgeDepthW)
    const rightEdge = analyzeEdgeBand(pixels, W, H, 'right', edgeDepthW)

    // ── Corners ───────────────────────────────────────────────────────────
    const tlCorner = analyzeCorner(pixels, W, H, 'topLeft', cornerW, cornerH)
    const trCorner = analyzeCorner(pixels, W, H, 'topRight', cornerW, cornerH)
    const blCorner = analyzeCorner(pixels, W, H, 'bottomLeft', cornerW, cornerH)
    const brCorner = analyzeCorner(pixels, W, H, 'bottomRight', cornerW, cornerH)

    const edgeScore =
      (topEdge.score + bottomEdge.score + leftEdge.score + rightEdge.score) / 4
    const cornerScore =
      (tlCorner.score + trCorner.score + blCorner.score + brCorner.score) / 4

    return {
      edges: { top: topEdge, bottom: bottomEdge, left: leftEdge, right: rightEdge },
      corners: { topLeft: tlCorner, topRight: trCorner, bottomLeft: blCorner, bottomRight: brCorner },
      edgeScore: Math.round(edgeScore * 2) / 2,
      cornerScore: Math.round(cornerScore * 2) / 2,
    }
  } finally {
    src.delete()
    gray.delete()
  }
}

function analyzeEdgeBand(
  pixels: Uint8ClampedArray,
  W: number,
  H: number,
  side: EdgeSide,
  depth: number
): EdgeCondition {
  let brightPixels = 0
  let totalPixels = 0
  let roughnessSum = 0
  let chipCandidates = 0

  const sampleMid = Math.floor(
    side === 'left' || side === 'right'
      ? Math.min(H * 0.1, H * 0.9)
      : Math.min(W * 0.1, W * 0.9)
  )

  // Build 1D brightness profile along the edge
  const profile: number[] = []

  if (side === 'top') {
    for (let y = 0; y < depth; y++) {
      for (let x = Math.round(W * 0.05); x < Math.round(W * 0.95); x++) {
        const i = (y * W + x) * 4
        const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
        if (lum > WHITENING_LUMA) brightPixels++
        totalPixels++
      }
    }
    for (let x = Math.round(W * 0.05); x < Math.round(W * 0.95); x++) {
      const i = (0 * W + x) * 4
      profile.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    }
  } else if (side === 'bottom') {
    for (let y = H - depth; y < H; y++) {
      for (let x = Math.round(W * 0.05); x < Math.round(W * 0.95); x++) {
        const i = (y * W + x) * 4
        const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
        if (lum > WHITENING_LUMA) brightPixels++
        totalPixels++
      }
    }
    for (let x = Math.round(W * 0.05); x < Math.round(W * 0.95); x++) {
      const i = ((H - 1) * W + x) * 4
      profile.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    }
  } else if (side === 'left') {
    for (let x = 0; x < depth; x++) {
      for (let y = Math.round(H * 0.05); y < Math.round(H * 0.95); y++) {
        const i = (y * W + x) * 4
        const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
        if (lum > WHITENING_LUMA) brightPixels++
        totalPixels++
      }
    }
    for (let y = Math.round(H * 0.05); y < Math.round(H * 0.95); y++) {
      const i = (y * W + 0) * 4
      profile.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    }
  } else {  // right
    for (let x = W - depth; x < W; x++) {
      for (let y = Math.round(H * 0.05); y < Math.round(H * 0.95); y++) {
        const i = (y * W + x) * 4
        const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
        if (lum > WHITENING_LUMA) brightPixels++
        totalPixels++
      }
    }
    for (let y = Math.round(H * 0.05); y < Math.round(H * 0.95); y++) {
      const i = (y * W + (W - 1)) * 4
      profile.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    }
  }

  const whiteningRatio = totalPixels > 0 ? brightPixels / totalPixels : 0

  // Roughness: variance in edge profile
  if (profile.length > 1) {
    const mean = profile.reduce((s, v) => s + v, 0) / profile.length
    const variance = profile.reduce((s, v) => s + (v - mean) ** 2, 0) / profile.length
    roughnessSum = Math.sqrt(variance) / 255
    // Detect chips: sudden large drops in profile
    for (let i = 1; i < profile.length; i++) {
      if (Math.abs(profile[i] - profile[i - 1]) > 40) chipCandidates++
    }
  }

  const chipCount = Math.floor(chipCandidates / 3)  // normalize
  const roughness = Math.min(1, roughnessSum * 3)

  // Score calculation
  const whiteningPenalty = whiteningRatio * 4
  const roughnessPenalty = roughness * 3
  const chipPenalty = Math.min(3, chipCount * 0.5)
  const score = Math.max(0, 10 - whiteningPenalty - roughnessPenalty - chipPenalty)

  return {
    side,
    whiteningRatio: Math.round(whiteningRatio * 100) / 100,
    roughness: Math.round(roughness * 100) / 100,
    chipCount,
    score: Math.round(score * 2) / 2,
  }
}

function analyzeCorner(
  pixels: Uint8ClampedArray,
  W: number,
  H: number,
  position: CornerPosition,
  cW: number,
  cH: number
): CornerCondition {
  let startX: number, startY: number
  switch (position) {
    case 'topLeft':     startX = 0;       startY = 0; break
    case 'topRight':    startX = W - cW;  startY = 0; break
    case 'bottomLeft':  startX = 0;       startY = H - cH; break
    case 'bottomRight': startX = W - cW;  startY = H - cH; break
  }

  let brightPixels = 0
  let darkPixels = 0
  let total = 0
  const cornerPixels: number[] = []

  for (let y = startY; y < startY + cH && y < H; y++) {
    for (let x = startX; x < startX + cW && x < W; x++) {
      const i = (y * W + x) * 4
      const lum = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
      cornerPixels.push(lum)
      if (lum > WHITENING_LUMA) brightPixels++
      if (lum < 30) darkPixels++
      total++
    }
  }

  const whitening = total > 0 ? brightPixels / total : 0

  // Sharpness: corners should have a clear diagonal transition
  // We approximate by checking variance in the corner diagonal
  const diagonalProfile: number[] = []
  const steps = Math.min(cW, cH)
  for (let k = 0; k < steps; k++) {
    let dx = k, dy = k
    switch (position) {
      case 'topRight':    dx = cW - 1 - k; break
      case 'bottomLeft':  dy = cH - 1 - k; break
      case 'bottomRight': dx = cW - 1 - k; dy = cH - 1 - k; break
    }
    const px = startX + dx
    const py = startY + dy
    if (px >= 0 && px < W && py >= 0 && py < H) {
      const i = (py * W + px) * 4
      diagonalProfile.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114)
    }
  }

  // Sharp corners have high gradient near the actual corner point
  let maxGrad = 0
  for (let i = 1; i < diagonalProfile.length; i++) {
    maxGrad = Math.max(maxGrad, Math.abs(diagonalProfile[i] - diagonalProfile[i - 1]))
  }
  const sharpness = Math.min(1, maxGrad / 80)

  // Ding detection: abnormal dark clusters in corner region
  const darkRatio = total > 0 ? darkPixels / total : 0
  const dinged = darkRatio > 0.08 || whitening > 0.4

  const whiteningPenalty = whitening * 5
  const sharpnessPenalty = (1 - sharpness) * 2
  const dingPenalty = dinged ? 1.5 : 0
  const score = Math.max(0, 10 - whiteningPenalty - sharpnessPenalty - dingPenalty)

  return {
    position,
    sharpness: Math.round(sharpness * 100) / 100,
    whitening: Math.round(whitening * 100) / 100,
    dinged,
    score: Math.round(score * 2) / 2,
  }
}
