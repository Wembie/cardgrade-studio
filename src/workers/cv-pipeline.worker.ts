import * as Comlink from 'comlink'
import { loadOpenCV } from '@/cv/opencv-loader'
import { checkScanQuality } from '@/cv/quality-checker'
import { detectCard } from '@/cv/card-detector'
import { analyzeCentering } from '@/cv/centering-analyzer'
import { analyzeSurface } from '@/cv/surface-analyzer'
import { analyzeEdges } from '@/cv/edge-analyzer'
import { estimateAllGrades } from '@/features/grading-engine/engine'
import type {
  ScanQuality,
  CardBounds,
  CenteringMeasurement,
  SurfaceAnalysis,
  EdgeAnalysis,
  GradeResult,
} from '@/shared/types'

export interface PipelineResult {
  quality: ScanQuality
  bounds: CardBounds | null
  centering: CenteringMeasurement
  surface: SurfaceAnalysis
  edges: EdgeAnalysis
  grades: GradeResult[]
  correctedDataUrl: string | null
}

export type ProgressCallback = (phase: string, progress: number) => void

async function pixelsToDataUrl(imageData: ImageData): Promise<string | null> {
  try {
    const canvas = new OffscreenCanvas(imageData.width, imageData.height)
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
    const buf = await blob.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return 'data:image/jpeg;base64,' + btoa(binary)
  } catch {
    return null
  }
}

const cvWorkerApi = {
  async runPipeline(
    pixelBuffer: ArrayBuffer,
    width: number,
    height: number,
    onProgress: ProgressCallback
  ): Promise<PipelineResult> {
    // Load OpenCV WASM — blocks this worker thread, NOT the main thread
    onProgress('loading_cv', 2)
    await loadOpenCV()

    const pixels = new Uint8ClampedArray(pixelBuffer)
    const imageData = new ImageData(pixels, width, height)

    onProgress('detecting', 10)
    const quality = checkScanQuality(imageData)

    onProgress('detecting', 20)
    const { bounds, correctedImageData } = await detectCard(imageData)
    const workingData = correctedImageData ?? imageData

    let correctedDataUrl: string | null = null
    if (correctedImageData) {
      correctedDataUrl = await pixelsToDataUrl(correctedImageData)
    }

    onProgress('centering', 40)
    const centering = await analyzeCentering(workingData)

    onProgress('surface', 60)
    const surface = await analyzeSurface(workingData)

    onProgress('edges', 80)
    const edges = await analyzeEdges(workingData)

    onProgress('grading', 95)
    const grades = estimateAllGrades(centering, surface, edges)

    return { quality, bounds, centering, surface, edges, grades, correctedDataUrl }
  },
}

export type CVWorkerApi = typeof cvWorkerApi

Comlink.expose(cvWorkerApi)
