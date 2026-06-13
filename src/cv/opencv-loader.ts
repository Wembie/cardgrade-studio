'use client'

declare global {
  interface Window {
    cv: CVInstance
    Module: {
      onRuntimeInitialized?: () => void
    }
  }
}

// Minimal OpenCV type surface — we use `any` for Mat operations
export interface CVInstance {
  // Core
  Mat: new (rows?: number, cols?: number, type?: number, data?: Uint8ClampedArray) => CVMat
  MatVector: new () => CVMatVector
  Size: new (width: number, height: number) => CVSize
  Point: new (x: number, y: number) => CVPoint
  Scalar: new (v0: number, v1?: number, v2?: number, v3?: number) => CVScalar
  RotatedRect: new () => CVRotatedRect

  // Image channels
  COLOR_RGBA2GRAY: number
  COLOR_RGBA2BGR: number
  COLOR_BGR2GRAY: number
  COLOR_BGR2HSV: number

  // Morph
  MORPH_RECT: number
  MORPH_ELLIPSE: number
  MORPH_CROSS: number
  RETR_EXTERNAL: number
  RETR_LIST: number
  CHAIN_APPROX_SIMPLE: number
  CHAIN_APPROX_NONE: number

  // Hough
  HOUGH_STANDARD: number
  HOUGH_PROBABILISTIC: number

  // Threshold
  THRESH_BINARY: number
  THRESH_BINARY_INV: number
  THRESH_OTSU: number
  THRESH_TOZERO: number
  THRESH_TOZERO_INV: number
  ADAPTIVE_THRESH_GAUSSIAN_C: number
  ADAPTIVE_THRESH_MEAN_C: number

  // Line types
  LINE_8: number
  LINE_4: number
  LINE_AA: number
  FONT_HERSHEY_SIMPLEX: number

  // Mat types
  CV_8UC1: number
  CV_8UC3: number
  CV_8UC4: number
  CV_32F: number
  CV_64F: number

  // Pixel-data I/O
  matFromImageData(imageData: ImageData): CVMat

  // Transforms
  cvtColor(src: CVMat, dst: CVMat, code: number): void
  GaussianBlur(src: CVMat, dst: CVMat, ksize: CVSize, sigmaX: number, sigmaY?: number): void
  medianBlur(src: CVMat, dst: CVMat, ksize: number): void
  bilateralFilter(src: CVMat, dst: CVMat, d: number, sigmaColor: number, sigmaSpace: number): void
  Canny(src: CVMat, dst: CVMat, threshold1: number, threshold2: number): void
  dilate(src: CVMat, dst: CVMat, kernel: CVMat): void
  erode(src: CVMat, dst: CVMat, kernel: CVMat): void
  morphologyEx(src: CVMat, dst: CVMat, op: number, kernel: CVMat): void
  threshold(src: CVMat, dst: CVMat, thresh: number, maxval: number, type: number): number
  adaptiveThreshold(
    src: CVMat, dst: CVMat, maxValue: number,
    adaptiveMethod: number, thresholdType: number,
    blockSize: number, C: number
  ): void
  equalizeHist(src: CVMat, dst: CVMat): void
  Sobel(src: CVMat, dst: CVMat, ddepth: number, dx: number, dy: number, ksize?: number): void
  Laplacian(src: CVMat, dst: CVMat, ddepth: number): void
  warpPerspective(src: CVMat, dst: CVMat, M: CVMat, dsize: CVSize): void
  getPerspectiveTransform(src: CVMat, dst: CVMat): CVMat
  resize(src: CVMat, dst: CVMat, dsize: CVSize, fx?: number, fy?: number): void
  pyrDown(src: CVMat, dst: CVMat): void
  HoughLines(src: CVMat, lines: CVMat, rho: number, theta: number, threshold: number): void
  HoughLinesP(
    src: CVMat, lines: CVMat, rho: number, theta: number,
    threshold: number, minLineLength?: number, maxLineGap?: number
  ): void

  // Geometry
  findContours(src: CVMat, contours: CVMatVector, hierarchy: CVMat, mode: number, method: number): void
  contourArea(contour: CVMat): number
  arcLength(curve: CVMat, closed: boolean): number
  approxPolyDP(curve: CVMat, approxCurve: CVMat, epsilon: number, closed: boolean): void
  boundingRect(contour: CVMat): { x: number; y: number; width: number; height: number }
  convexHull(points: CVMat, hull: CVMat): void
  minAreaRect(points: CVMat): CVRotatedRect
  boxPoints(rect: CVRotatedRect, points: CVMat): void
  isContourConvex(contour: CVMat): boolean

  // Drawing
  line(img: CVMat, pt1: CVPoint, pt2: CVPoint, color: CVScalar, thickness: number): void
  rectangle(img: CVMat, pt1: CVPoint, pt2: CVPoint, color: CVScalar, thickness: number): void
  circle(img: CVMat, center: CVPoint, radius: number, color: CVScalar, thickness: number): void
  drawContours(img: CVMat, contours: CVMatVector, contourIdx: number, color: CVScalar, thickness: number): void
  putText(img: CVMat, text: string, org: CVPoint, fontFace: number, fontScale: number, color: CVScalar, thickness: number): void

  // Stats
  mean(src: CVMat): CVScalar
  meanStdDev(src: CVMat, mean: CVMat, stddev: CVMat): void
  minMaxLoc(src: CVMat): { minVal: number; maxVal: number; minLoc: CVPoint; maxLoc: CVPoint }
  countNonZero(src: CVMat): number

  // Struct
  getStructuringElement(shape: number, ksize: CVSize): CVMat
  imshow(canvas: HTMLCanvasElement | string, mat: CVMat): void
}

export interface CVMat {
  rows: number
  cols: number
  data: Uint8ClampedArray
  data32S: Int32Array
  data32F: Float32Array
  type(): number
  channels(): number
  size(): CVSize
  delete(): void
  clone(): CVMat
  roi(rect: { x: number; y: number; width: number; height: number }): CVMat
  copyTo(dst: CVMat): void
}

export interface CVMatVector {
  size(): number
  get(i: number): CVMat
  push_back(m: CVMat): void
  delete(): void
}

export interface CVSize {
  width: number
  height: number
}

export interface CVPoint {
  x: number
  y: number
}

export interface CVScalar {
  0: number; 1: number; 2: number; 3: number
}

export interface CVRotatedRect {
  center: CVPoint
  size: CVSize
  angle: number
}

// ── Loader ────────────────────────────────────────────────────────────────────

// v=2: WASM extracted to opencv.wasm — busts HTTP cache of old 9.8 MB embedded build
const OPENCV_URL = '/opencv.js?v=2'

let loadPromise: Promise<CVInstance> | null = null

// Script-tag injection is the ONLY correct approach for browser loading.
//
// History of failed approaches (do not retry these):
//
// 1. new Function(code).call(globalThis) + wasmBinary pre-decode
//    PROBLEM A: Uint8Array.from(binaryStr, c => c.charCodeAt(0)) iterates ~6 million chars
//    synchronously on the main thread → blocks UI + prevents setTimeout from firing → user
//    sees infinite "Loading CV engine" with no timeout ever triggering.
//    PROBLEM B: opencv.js wraps Emscripten in a UMD factory function. Inside that factory,
//    `var Module = typeof Module != 'undefined' ? Module : {}` creates a LOCAL variable
//    (hoisting makes typeof Module → 'undefined' before assignment). window.Module is NEVER
//    seen by Emscripten → wasmBinary injection is a no-op → Emscripten still fetches data:URI.
//
// 2. new Function(code) without wasmBinary
//    Same PROBLEM A. Also same PROBLEM B for any Module hooks.
//
// Script tags: loaded async by the browser (non-blocking), execute at correct scope,
// UMD sets window.cv = factory() where cv is a thenable. We await it via onload + .then().
// fetch('data:URI') works fine in the main thread (only hangs in Web Workers).
export function loadOpenCV(): Promise<CVInstance> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise<CVInstance>((resolve, reject) => {
    const w = globalThis as unknown as Record<string, unknown>

    const existing = w['cv'] as CVInstance | undefined
    if (existing?.Mat) { resolve(existing); return }

    const timer = setTimeout(
      () => reject(new Error('OpenCV.js init timeout (120s)')),
      120_000
    )

    const done = (cv: CVInstance) => { clearTimeout(timer); resolve(cv) }
    const fail = (e: Error) => { clearTimeout(timer); reject(e) }

    const script = document.createElement('script')
    script.src = OPENCV_URL
    script.async = true

    script.onerror = () => fail(new Error('Failed to load /opencv.js'))

    script.onload = () => {
      const raw = w['cv']
      if (!raw) { fail(new Error('cv not defined after script load')); return }

      if (typeof (raw as { then?: unknown }).then === 'function') {
        // Async WASM build: cv is a thenable that resolves when WASM compilation finishes
        ;(raw as Promise<CVInstance>).then(done, (e) =>
          fail(e instanceof Error ? e : new Error(String(e)))
        )
      } else if ((raw as CVInstance).Mat) {
        done(raw as CVInstance)
      } else {
        fail(new Error('cv loaded but Mat unavailable'))
      }
    }

    document.head.appendChild(script)
  })

  loadPromise.catch(() => { loadPromise = null })
  return loadPromise
}

export function isOpenCVReady(): boolean {
  const g = globalThis as unknown as Record<string, CVInstance>
  return !!g['cv']?.Mat
}
