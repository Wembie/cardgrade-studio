'use client'

import { useState, useCallback, useEffect } from 'react'
import type { CardCorners, AnalysisState, AnalysisResult } from '@/shared/types'
import { warpPerspective } from '@/math/perspective'
import { analyzeCentering } from '@/math/centering'
import { analyzeSurface } from '@/math/surface'
import { analyzeEdges } from '@/math/edges'
import { analyzeCorners } from '@/math/corners'
import { estimateGrades } from '@/math/grading'

export interface UseAnalyzerReturn {
  imageFile: File | null
  imageUrl: string | null
  imageDimensions: { width: number; height: number } | null
  corners: CardCorners | null
  analysisState: AnalysisState
  setImage: (file: File) => void
  setCorners: (corners: CardCorners) => void
  analyze: () => Promise<void>
  reset: () => void
}

export function useAnalyzer(): UseAnalyzerReturn {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [corners, setCorners] = useState<CardCorners | null>(null)
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: 'idle' })

  // Revoke object URL on cleanup or when it changes
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [imageUrl])

  const setImage = useCallback((file: File) => {
    // Revoke previous URL if any
    setImageUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })

    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight

      setImageFile(file)
      setImageUrl(url)
      setImageDimensions({ width: w, height: h })
      setAnalysisState({ status: 'idle' })

      // Initialize corners at 5% inset from each corner
      const insetX = w * 0.05
      const insetY = h * 0.05
      const initialCorners: CardCorners = [
        { x: insetX,     y: insetY },      // TL
        { x: w - insetX, y: insetY },      // TR
        { x: w - insetX, y: h - insetY },  // BR
        { x: insetX,     y: h - insetY },  // BL
      ]
      setCorners(initialCorners)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      setAnalysisState({ status: 'error', message: 'Failed to load image.' })
    }

    img.src = url
  }, [])

  const updateCorners = useCallback((newCorners: CardCorners) => {
    setCorners(newCorners)
  }, [])

  const analyze = useCallback(async () => {
    if (!imageUrl || !corners || !imageDimensions) {
      setAnalysisState({ status: 'error', message: 'No image or corners set.' })
      return
    }

    setAnalysisState({ status: 'analyzing' })

    try {
      // Load image onto canvas to get ImageData
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = imageUrl
      })

      // Draw to canvas to get ImageData
      let srcImageData: ImageData
      if (typeof OffscreenCanvas !== 'undefined') {
        const oc = new OffscreenCanvas(imageDimensions.width, imageDimensions.height)
        const ctx = oc.getContext('2d')
        if (!ctx) throw new Error('Could not get OffscreenCanvas 2D context')
        ctx.drawImage(img, 0, 0)
        srcImageData = ctx.getImageData(0, 0, imageDimensions.width, imageDimensions.height)
      } else {
        const canvas = document.createElement('canvas')
        canvas.width = imageDimensions.width
        canvas.height = imageDimensions.height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Could not get canvas 2D context')
        ctx.drawImage(img, 0, 0)
        srcImageData = ctx.getImageData(0, 0, imageDimensions.width, imageDimensions.height)
      }

      // Warp perspective to standard card size 500x700
      const OUT_W = 500
      const OUT_H = 700
      const warped = warpPerspective(srcImageData, corners, OUT_W, OUT_H)

      // Run all 4 analysis functions
      const centering = analyzeCentering(warped)
      const surface = analyzeSurface(warped)
      const edges = analyzeEdges(warped)
      const cornerResult = analyzeCorners(warped)

      // Estimate grades
      const grades = estimateGrades(centering, surface, edges, cornerResult)

      // Compute angle deviation from corners
      const [TL, TR, , BL] = corners
      const topAngle = Math.atan2(TR.y - TL.y, TR.x - TL.x) * (180 / Math.PI)
      const leftAngle = Math.atan2(BL.y - TL.y, BL.x - TL.x) * (180 / Math.PI)
      // leftAngle should be ~90°; deviation is how far from ideal
      const angleDeviation = Math.sqrt(topAngle * topAngle + (leftAngle - 90) * (leftAngle - 90)) / 2

      // Convert warped ImageData to dataURL
      const warpCanvas = document.createElement('canvas')
      warpCanvas.width = OUT_W
      warpCanvas.height = OUT_H
      const warpCtx = warpCanvas.getContext('2d')
      if (!warpCtx) throw new Error('Could not get canvas 2D context for warped image')
      warpCtx.putImageData(warped, 0, 0)
      const warpedDataUrl = warpCanvas.toDataURL('image/jpeg', 0.85)

      const result: AnalysisResult = {
        centering,
        surface,
        edges,
        corners: cornerResult,
        grades,
        warpedDataUrl,
        angleDeviation,
      }

      setAnalysisState({ status: 'done', result })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed.'
      setAnalysisState({ status: 'error', message })
    }
  }, [imageUrl, corners, imageDimensions])

  const reset = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }
    setImageFile(null)
    setImageUrl(null)
    setImageDimensions(null)
    setCorners(null)
    setAnalysisState({ status: 'idle' })
  }, [imageUrl])

  return {
    imageFile,
    imageUrl,
    imageDimensions,
    corners,
    analysisState,
    setImage,
    setCorners: updateCorners,
    analyze,
    reset,
  }
}
