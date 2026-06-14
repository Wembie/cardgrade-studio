'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { CardCorners, AnalysisState, AnalysisResult } from '@/shared/types'
import { warpPerspective } from '@/math/perspective'
import { analyzeCentering, analyzeCenteringFromCorners } from '@/math/centering'
import { analyzeSurface } from '@/math/surface'
import { analyzeEdges } from '@/math/edges'
import { analyzeCorners } from '@/math/corners'
import { estimateGrades } from '@/math/grading'

const OUT_W = 500
const OUT_H = 700

export interface UseAnalyzerReturn {
  imageFile: File | null
  imageUrl: string | null
  imageDimensions: { width: number; height: number } | null
  outerCorners: CardCorners | null
  innerCorners: CardCorners | null  // derived from outerCorners + borderPercent
  borderPercent: number
  analysisState: AnalysisState
  setImage: (file: File) => void
  setOuterCorners: (corners: CardCorners) => void
  setBorderPercent: (pct: number) => void
  analyze: () => Promise<void>
  reset: () => void
}

export function useAnalyzer(): UseAnalyzerReturn {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [outerCorners, setOuterCorners] = useState<CardCorners | null>(null)
  const [borderPercent, setBorderPercent] = useState(8)
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: 'idle' })

  // Inner corners are derived — no separate state needed
  const innerCorners = useMemo((): CardCorners | null => {
    if (!outerCorners) return null
    const [TL, TR, BR, BL] = outerCorners
    const cardW = ((TR.x - TL.x) + (BR.x - BL.x)) / 2
    const cardH = ((BL.y - TL.y) + (BR.y - TR.y)) / 2
    const ix = cardW * borderPercent / 100
    const iy = cardH * borderPercent / 100
    return [
      { x: TL.x + ix, y: TL.y + iy },
      { x: TR.x - ix, y: TR.y + iy },
      { x: BR.x - ix, y: BR.y - iy },
      { x: BL.x + ix, y: BL.y - iy },
    ]
  }, [outerCorners, borderPercent])

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }
  }, [imageUrl])

  const setImage = useCallback((file: File) => {
    setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight

      setImageFile(file)
      setImageUrl(url)
      setImageDimensions({ width: w, height: h })
      setAnalysisState({ status: 'idle' })

      // Outer corners at 5% inset — assumes photo has a small background margin
      const ox = w * 0.05, oy = h * 0.05
      setOuterCorners([
        { x: ox,     y: oy },
        { x: w - ox, y: oy },
        { x: w - ox, y: h - oy },
        { x: ox,     y: h - oy },
      ])
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      setAnalysisState({ status: 'error', message: 'Failed to load image.' })
    }

    img.src = url
  }, [])

  const analyze = useCallback(async () => {
    if (!imageUrl || !outerCorners || !imageDimensions) {
      setAnalysisState({ status: 'error', message: 'No image or corners set.' })
      return
    }

    setAnalysisState({ status: 'analyzing' })

    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = imageUrl
      })

      let srcImageData: ImageData
      if (typeof OffscreenCanvas !== 'undefined') {
        const oc = new OffscreenCanvas(imageDimensions.width, imageDimensions.height)
        const ctx = oc.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        srcImageData = ctx.getImageData(0, 0, imageDimensions.width, imageDimensions.height)
      } else {
        const canvas = document.createElement('canvas')
        canvas.width = imageDimensions.width
        canvas.height = imageDimensions.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        srcImageData = ctx.getImageData(0, 0, imageDimensions.width, imageDimensions.height)
      }

      const warped = warpPerspective(srcImageData, outerCorners, OUT_W, OUT_H)

      // If user placed inner corners, use them directly (accurate).
      // Otherwise fall back to pixel-scan on the warped image.
      const centering = innerCorners
        ? analyzeCenteringFromCorners(outerCorners, innerCorners, OUT_W, OUT_H)
        : analyzeCentering(warped)

      const surface      = analyzeSurface(warped)
      const edges        = analyzeEdges(warped)
      const cornerResult = analyzeCorners(warped)
      const grades       = estimateGrades(centering, surface, edges, cornerResult)

      const [TL, TR, , BL] = outerCorners
      const topAngle  = Math.atan2(TR.y - TL.y, TR.x - TL.x) * (180 / Math.PI)
      const leftAngle = Math.atan2(BL.y - TL.y, BL.x - TL.x) * (180 / Math.PI)
      const angleDeviation = Math.sqrt(topAngle ** 2 + (leftAngle - 90) ** 2) / 2

      const warpCanvas = document.createElement('canvas')
      warpCanvas.width = OUT_W
      warpCanvas.height = OUT_H
      const warpCtx = warpCanvas.getContext('2d')!
      warpCtx.putImageData(warped, 0, 0)
      const warpedDataUrl = warpCanvas.toDataURL('image/jpeg', 0.85)

      const result: AnalysisResult = {
        centering, surface, edges, corners: cornerResult,
        grades, warpedDataUrl, angleDeviation,
      }

      setAnalysisState({ status: 'done', result })
    } catch (err) {
      setAnalysisState({ status: 'error', message: err instanceof Error ? err.message : 'Analysis failed.' })
    }
  }, [imageUrl, outerCorners, innerCorners, imageDimensions])

  const reset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageFile(null)
    setImageUrl(null)
    setImageDimensions(null)
    setOuterCorners(null)
    setBorderPercent(8)
    setAnalysisState({ status: 'idle' })
  }, [imageUrl])

  return {
    imageFile, imageUrl, imageDimensions,
    outerCorners, innerCorners,
    borderPercent,
    analysisState,
    setImage,
    setOuterCorners,
    setBorderPercent,
    analyze,
    reset,
  }
}
