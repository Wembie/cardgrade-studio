'use client'

import { useCallback, useEffect, useRef } from 'react'
import * as Comlink from 'comlink'
import { useAnalysisStore } from '../store'
import { dataUrlToImageData } from '@/shared/lib/utils'
import type { CVWorkerApi } from '@/workers/cv-pipeline.worker'
import type { AnalysisPhase } from '../store'

export function useAnalysisPipeline() {
  const store = useAnalysisStore()
  const workerRef = useRef<Worker | null>(null)
  const apiRef = useRef<Comlink.Remote<CVWorkerApi> | null>(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../../../workers/cv-pipeline.worker', import.meta.url)
    )
    workerRef.current = worker
    apiRef.current = Comlink.wrap<CVWorkerApi>(worker)

    return () => {
      worker.terminate()
      workerRef.current = null
      apiRef.current = null
    }
  }, [])

  const runAnalysis = useCallback(async (dataUrl: string) => {
    const api = apiRef.current
    if (!api) return

    store.setError(null)
    store.setPhase('loading_cv', 2)

    try {
      const imageData = await dataUrlToImageData(dataUrl)
      // Transfer the pixel buffer zero-copy to worker
      const buffer = imageData.data.buffer.slice(0)

      const result = await api.runPipeline(
        Comlink.transfer(buffer, [buffer]),
        imageData.width,
        imageData.height,
        Comlink.proxy((phase: string, progress: number) => {
          store.setPhase(phase as AnalysisPhase, progress)
        })
      )

      store.setQuality(result.quality)
      if (result.bounds) store.setCardBounds(result.bounds)
      if (result.correctedDataUrl) store.setCorrectedDataUrl(result.correctedDataUrl)
      store.setCentering(result.centering)
      store.setSurface(result.surface)
      store.setEdges(result.edges)
      store.setGrades(result.grades)
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
