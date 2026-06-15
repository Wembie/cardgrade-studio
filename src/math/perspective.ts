import type { Point, CardCorners } from '@/shared/types'

// ── Homography via DLT (Direct Linear Transform) ──────────────────────────────
//
// For each correspondence (xi,yi) → (xi',yi') we get 2 equations:
//   [-xi, -yi, -1,  0,   0,   0,  xi*xi', yi*xi', xi']  h = 0
//   [0,    0,   0, -xi, -yi, -1,  xi*yi', yi*yi', yi']  h = 0
//
// With 4 point pairs we have 8 equations and 8 unknowns (h[8] = 1 fixed).
// We solve the 8x8 linear system A*x = b via Gaussian elimination.

function computeHomography(src: CardCorners, dst: CardCorners): Float64Array {
  // Build 8x9 matrix A where each row pair corresponds to one point correspondence
  const A: number[][] = []

  for (let i = 0; i < 4; i++) {
    const sx = src[i].x
    const sy = src[i].y
    const dx = dst[i].x
    const dy = dst[i].y

    // Row 1: -sx, -sy, -1, 0, 0, 0, sx*dx, sy*dx, dx
    A.push([-sx, -sy, -1, 0, 0, 0, sx * dx, sy * dx, dx])
    // Row 2: 0, 0, 0, -sx, -sy, -1, sx*dy, sy*dy, dy
    A.push([0, 0, 0, -sx, -sy, -1, sx * dy, sy * dy, dy])
  }

  // We fix h[8] = 1, so move the last column to the RHS:
  // A[0..7][0..7] * h[0..7] = -A[0..7][8]
  const mat: number[][] = A.map(row => row.slice(0, 8))
  const rhs: number[] = A.map(row => -row[8])

  // Gaussian elimination with partial pivoting
  gaussianElimination(mat, rhs)

  const h = new Float64Array(9)
  for (let i = 0; i < 8; i++) h[i] = rhs[i]
  h[8] = 1
  return h
}

function gaussianElimination(mat: number[][], rhs: number[]): void {
  const n = 8
  for (let col = 0; col < n; col++) {
    // Find pivot row
    let maxVal = Math.abs(mat[col][col])
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(mat[row][col])
      if (v > maxVal) {
        maxVal = v
        maxRow = row
      }
    }
    // Swap rows
    if (maxRow !== col) {
      ;[mat[col], mat[maxRow]] = [mat[maxRow], mat[col]]
      ;[rhs[col], rhs[maxRow]] = [rhs[maxRow], rhs[col]]
    }
    // Eliminate below
    for (let row = col + 1; row < n; row++) {
      const factor = mat[row][col] / (mat[col][col] || 1e-12)
      for (let k = col; k < n; k++) {
        mat[row][k] -= factor * mat[col][k]
      }
      rhs[row] -= factor * rhs[col]
    }
  }
  // Back substitution
  for (let row = n - 1; row >= 0; row--) {
    let sum = rhs[row]
    for (let k = row + 1; k < n; k++) {
      sum -= mat[row][k] * rhs[k]
    }
    rhs[row] = sum / (mat[row][row] || 1e-12)
  }
}

function applyHomography(h: Float64Array, x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8]
  return {
    x: (h[0] * x + h[1] * y + h[2]) / w,
    y: (h[3] * x + h[4] * y + h[5]) / w,
  }
}

// ── Bilinear Sampling ─────────────────────────────────────────────────────────

function bilinearSample(
  data: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  px: number,
  py: number,
  outPixel: Uint8ClampedArray,
  outIdx: number,
): void {
  const x0 = Math.floor(px)
  const y0 = Math.floor(py)
  const x1 = x0 + 1
  const y1 = y0 + 1
  const fx = px - x0
  const fy = py - y0

  // Clamp to image bounds
  const cx0 = Math.max(0, Math.min(srcW - 1, x0))
  const cy0 = Math.max(0, Math.min(srcH - 1, y0))
  const cx1 = Math.max(0, Math.min(srcW - 1, x1))
  const cy1 = Math.max(0, Math.min(srcH - 1, y1))

  const i00 = (cy0 * srcW + cx0) * 4
  const i10 = (cy0 * srcW + cx1) * 4
  const i01 = (cy1 * srcW + cx0) * 4
  const i11 = (cy1 * srcW + cx1) * 4

  for (let c = 0; c < 4; c++) {
    const v00 = data[i00 + c]
    const v10 = data[i10 + c]
    const v01 = data[i01 + c]
    const v11 = data[i11 + c]
    outPixel[outIdx + c] = Math.round(
      v00 * (1 - fx) * (1 - fy) +
        v10 * fx * (1 - fy) +
        v01 * (1 - fx) * fy +
        v11 * fx * fy,
    )
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Project a set of points from warped-rect space (0,0 to outW×outH) back into
 * the original image coordinate space defined by `outer`. Inverse of projectIntoRect.
 * Used to convert auto-detected border positions in the warped image back to
 * original-image corner coordinates for visual display.
 */
export function projectFromRect(
  outer: CardCorners,
  points: CardCorners,
  outW: number,
  outH: number,
): CardCorners {
  const rect: CardCorners = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ]
  const h = computeHomography(rect, outer)
  return points.map(pt => applyHomography(h, pt.x, pt.y)) as CardCorners
}

/**
 * Project a set of points from the same coordinate space as `outer` into a
 * normalized rectangle of size outW × outH, using the homography defined by
 * outer → rect. Used to map inner (artwork) corners into warped card space
 * for direct centering measurement.
 */
export function projectIntoRect(
  outer: CardCorners,
  points: CardCorners,
  outW: number,
  outH: number,
): CardCorners {
  const rect: CardCorners = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ]
  const h = computeHomography(outer, rect)
  return points.map(pt => applyHomography(h, pt.x, pt.y)) as CardCorners
}

/**
 * Perspective-warp a card from arbitrary quadrilateral corners to a
 * rectangular output image of size outW x outH.
 *
 * corners = [TL, TR, BR, BL] in the source ImageData coordinate space.
 * The destination rectangle is [0,0], [outW-1,0], [outW-1,outH-1], [0,outH-1].
 */
export function warpPerspective(
  src: ImageData,
  corners: CardCorners,
  outW: number,
  outH: number,
): ImageData {
  const dstCorners: CardCorners = [
    { x: 0, y: 0 },
    { x: outW - 1, y: 0 },
    { x: outW - 1, y: outH - 1 },
    { x: 0, y: outH - 1 },
  ]

  // We need dst→src mapping (inverse warp), so compute H from dst corners to src corners
  const hInv = computeHomography(dstCorners, corners)

  const outData = new Uint8ClampedArray(outW * outH * 4)

  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      const srcPt = applyHomography(hInv, dx, dy)
      bilinearSample(src.data, src.width, src.height, srcPt.x, srcPt.y, outData, (dy * outW + dx) * 4)
    }
  }

  return new ImageData(outData, outW, outH)
}
