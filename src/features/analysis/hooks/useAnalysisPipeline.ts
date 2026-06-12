'use client'

import { useCallback } from 'react'
import { useAnalysisStore } from '../store'
import { dataUrlToImageData } from '@/shared/lib/utils'
import { loadOpenCV } from '@/cv/opencv-loader'
import { checkScanQuality } from '@/cv/quality-checker'
import { detectCard } from '@/cv/card-detector'
import { analyzeCentering } from '@/cv/centering-analyzer'
import { analyzeSurface } from '@/cv/surface-analyzer'
import { analyzeEdges } from '@/cv/edge-analyzer'
import { estimateAllGrades } from '@/features/grading-engine/engine'

// Yield to the browser event loop between heavy sync CV steps so the progress UI can repaint.
const tick = () => new Promise<void>(r => setTimeout(r, 0))

export function useAnalysisPipeline() {
  const store = useAnalysisStore()

  const runAnalysis = useCallback(async (dataUrl: string) => {
    store.setError(null)
    store.setPhase('loading_cv', 2)

    try {
      const imageData = await dataUrlToImageData(dataUrl)

      // WASM compilation is async — main thread stays responsive during the ~15-30s wait.
      await loadOpenCV()

      store.setPhase('detecting', 10)
      await tick()
      const quality = checkScanQuality(imageData)

      store.setPhase('detecting', 20)
      await tick()
      const { bounds, correctedImageData } = await detectCard(imageData)
      const workingData = correctedImageData ?? imageData

      let correctedDataUrl: string | null = null
      if (correctedImageData) {
        const canvas = document.createElement('canvas')
        canvas.width = correctedImageData.width
        canvas.height = correctedImageData.height
        canvas.getContext('2d')!.putImageData(correctedImageData, 0, 0)
        correctedDataUrl = canvas.toDataURL('image/jpeg', 0.92)
      }

      store.setPhase('centering', 40)
      await tick()
      const centering = await analyzeCentering(workingData)

      store.setPhase('surface', 60)
      await tick()
      const surface = await analyzeSurface(workingData)

      store.setPhase('edges', 80)
      await tick()
      const edges = await analyzeEdges(workingData)

      store.setPhase('grading', 95)
      await tick()
      const grades = estimateAllGrades(centering, surface, edges)

      store.setQuality(quality)
      if (bounds) store.setCardBounds(bounds)
      if (correctedDataUrl) store.setCorrectedDataUrl(correctedDataUrl)
      store.setCentering(centering)
      store.setSurface(surface)
      store.setEdges(edges)
      store.setGrades(grades)
      store.setPhase('complete', 100)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      store.setError(msg)
      console.error('[analysis pipeline]', err)
    }
  }, [store])

  const reset = useCallback(() => {
    store.reset()
  }, [store])

  return { runAnalysis, reset }
}
