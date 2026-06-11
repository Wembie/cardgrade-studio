'use client'

import { useCallback } from 'react'
import { useAnalysisStore } from '../store'
import { loadOpenCV } from '@/cv/opencv-loader'
import { checkScanQuality } from '@/cv/quality-checker'
import { detectCard } from '@/cv/card-detector'
import { analyzeCentering } from '@/cv/centering-analyzer'
import { analyzeSurface } from '@/cv/surface-analyzer'
import { analyzeEdges } from '@/cv/edge-analyzer'
import { estimateAllGrades } from '@/features/grading-engine/engine'
import { dataUrlToImageData } from '@/shared/lib/utils'

export function useAnalysisPipeline() {
  const store = useAnalysisStore()

  const runAnalysis = useCallback(async (dataUrl: string) => {
    store.setError(null)
    store.setPhase('loading_cv', 2)

    try {
      // 0. Pre-warm OpenCV WASM (first call compiles ~8 MB; subsequent calls instant)
      await loadOpenCV()

      // 1. Load image pixels
      const imageData = await dataUrlToImageData(dataUrl)

      // 2. Quality check
      store.setPhase('detecting', 10)
      const quality = checkScanQuality(imageData)
      store.setQuality(quality)

      if (!quality.pass && quality.issues.includes('card_not_found')) {
        store.setError('Card could not be detected. Try better lighting or a different angle.')
        return
      }

      // 3. Card detection + perspective correction
      store.setPhase('detecting', 20)
      const { bounds, correctedImageData } = await detectCard(imageData)
      store.setCardBounds(bounds)

      // Use corrected image if available, otherwise use original
      const workingData = correctedImageData ?? imageData

      // Convert corrected image to data URL for display
      if (correctedImageData) {
        const offscreen = new OffscreenCanvas(correctedImageData.width, correctedImageData.height)
        const ctx = offscreen.getContext('2d')!
        ctx.putImageData(correctedImageData, 0, 0)
        const blob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.92 })
        const url = URL.createObjectURL(blob)
        store.setCorrectedDataUrl(url)
      }

      // 4. Centering analysis
      store.setPhase('centering', 40)
      const centering = await analyzeCentering(workingData)
      store.setCentering(centering)

      // 5. Surface analysis
      store.setPhase('surface', 60)
      const surface = await analyzeSurface(workingData)
      store.setSurface(surface)

      // 6. Edge & corner analysis
      store.setPhase('edges', 80)
      const edges = await analyzeEdges(workingData)
      store.setEdges(edges)

      // 7. Grade estimation
      store.setPhase('grading', 95)
      const grades = estimateAllGrades(centering, surface, edges)
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
