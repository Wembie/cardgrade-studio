import { loadOpenCV } from './opencv-loader'
import type { Point } from '@/shared/types'

/**
 * True perspective warp using OpenCV getPerspectiveTransform + warpPerspective.
 */
export async function warpPerspectiveWithPoints(
  imageData: ImageData,
  corners: [Point, Point, Point, Point],
  outW: number,
  outH: number
): Promise<ImageData> {
  const cv = await loadOpenCV()

  const src = cv.matFromImageData(imageData)

  // Build source and destination point matrices as CV_32F (8 floats each)
  const srcPtsArr = new Float32Array([
    corners[0].x, corners[0].y,
    corners[1].x, corners[1].y,
    corners[2].x, corners[2].y,
    corners[3].x, corners[3].y,
  ])
  const dstPtsArr = new Float32Array([
    0,    0,
    outW, 0,
    outW, outH,
    0,    outH,
  ])

  // OpenCV.js requires constructing Mats from raw data
  const srcPtsMat = cv.matFromImageData(imageData)
  // We have to use the constructor form that accepts data pointers
  // Fortunately OpenCV.js allows: new cv.Mat(rows, cols, type, data)
  // but the data must be passed as Uint8Array. For float we use CV_32F:
  const srcPoints = new cv.Mat(4, 2, cv.CV_32F)
  const dstPoints = new cv.Mat(4, 2, cv.CV_32F)

  srcPoints.data32F.set(srcPtsArr)
  dstPoints.data32F.set(dstPtsArr)

  srcPtsMat.delete()

  const M = cv.getPerspectiveTransform(srcPoints, dstPoints)
  const dst = new cv.Mat()
  cv.warpPerspective(src, dst, M, new cv.Size(outW, outH))

  // Extract ImageData from dst
  const outCanvas = new OffscreenCanvas(outW, outH)
  const ctx = outCanvas.getContext('2d')!
  cv.imshow(outCanvas as unknown as HTMLCanvasElement, dst)
  const result = ctx.getImageData(0, 0, outW, outH)

  src.delete()
  srcPoints.delete()
  dstPoints.delete()
  M.delete()
  dst.delete()

  return result
}
