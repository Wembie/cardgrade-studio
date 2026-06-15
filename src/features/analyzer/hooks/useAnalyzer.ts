'use client'

import { useState, useCallback, useEffect } from 'react'
import type { CardCorners, AnalysisState, AnalysisResult } from '@/shared/types'
import { warpPerspective, projectFromRect } from '@/math/perspective'
import { analyzeCentering, analyzeCenteringFromCorners, getBorderWidthsPx } from '@/math/centering'
import { CARD_TYPES, DEFAULT_CARD_TYPE, type CardTypeDef } from '@/shared/constants/cardTypes'
import { analyzeSurface } from '@/math/surface'
import { analyzeEdges } from '@/math/edges'
import { analyzeCorners } from '@/math/corners'
import { estimateGrades } from '@/math/grading'

const OUT_W = 500
const OUT_H = 700

function computeInnerCorners(outer: CardCorners, pct: number): CardCorners {
  const [TL, TR, BR, BL] = outer
  const cardW = ((TR.x - TL.x) + (BR.x - BL.x)) / 2
  const cardH = ((BL.y - TL.y) + (BR.y - TR.y)) / 2
  const ix = cardW * pct / 100
  const iy = cardH * pct / 100
  return [
    { x: TL.x + ix, y: TL.y + iy },
    { x: TR.x - ix, y: TR.y + iy },
    { x: BR.x - ix, y: BR.y - iy },
    { x: BL.x + ix, y: BL.y - iy },
  ]
}

export interface UseAnalyzerReturn {
  imageFile: File | null
  imageUrl: string | null
  imageDimensions: { width: number; height: number } | null
  outerCorners: CardCorners | null
  innerCorners: CardCorners | null
  borderPercent: number
  cardType: CardTypeDef
  analysisState: AnalysisState
  setImage: (file: File) => void
  setOuterCorners: (corners: CardCorners) => void
  setInnerCorners: (corners: CardCorners) => void
  setBorderPercent: (pct: number) => void
  setCardType: (type: CardTypeDef) => void
  analyze: () => Promise<void>
  reset: () => void
}

export function useAnalyzer(): UseAnalyzerReturn {
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [outerCorners, setOuterCorners] = useState<CardCorners | null>(null)
  const [innerCorners, setInnerCornersRaw] = useState<CardCorners | null>(null)
  const [innerCornersManual, setInnerCornersManual] = useState(false)
  const [borderPercent, setBorderPercentRaw] = useState(8)
  const [cardType, setCardType] = useState<CardTypeDef>(DEFAULT_CARD_TYPE)
  const [analysisState, setAnalysisState] = useState<AnalysisState>({ status: 'idle' })

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }
  }, [imageUrl])

  // User dragging inner corner handles → mark as manual so analysis trusts these corners
  const setInnerCorners = useCallback((corners: CardCorners) => {
    setInnerCornersRaw(corners)
    setInnerCornersManual(true)
  }, [])

  // Slider changes reset to auto mode — pixel scan will determine real border on next analyze
  const setBorderPercent = useCallback((pct: number) => {
    setBorderPercentRaw(pct)
    setInnerCornersManual(false)
    if (outerCorners) setInnerCornersRaw(computeInnerCorners(outerCorners, pct))
  }, [outerCorners])

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
      setInnerCornersManual(false)

      const ox = w * 0.05, oy = h * 0.05
      const outer: CardCorners = [
        { x: ox,     y: oy },
        { x: w - ox, y: oy },
        { x: w - ox, y: h - oy },
        { x: ox,     y: h - oy },
      ]
      setOuterCorners(outer)
      setInnerCornersRaw(computeInnerCorners(outer, 8))
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

      // Manual inner corners (user-dragged) → use corner-based centering.
      // Auto mode → pixel scan on the warped image gives real border positions.
      let centering: ReturnType<typeof analyzeCentering>
      let bw: { left: number; right: number; top: number; bottom: number }

      if (innerCornersManual && innerCorners) {
        centering = analyzeCenteringFromCorners(outerCorners, innerCorners, OUT_W, OUT_H)
        bw = getBorderWidthsPx(outerCorners, innerCorners, OUT_W, OUT_H)
      } else {
        centering = analyzeCentering(warped)
        bw = {
          left:   centering.leftBorder,
          right:  centering.rightBorder,
          top:    centering.topBorder,
          bottom: centering.bottomBorder,
        }
        // Project detected border positions back to original image coords so the
        // inner corner handles move to reflect what the pixel scan actually found.
        const detectedInner: CardCorners = [
          { x: bw.left,          y: bw.top },
          { x: OUT_W - bw.right, y: bw.top },
          { x: OUT_W - bw.right, y: OUT_H - bw.bottom },
          { x: bw.left,          y: OUT_H - bw.bottom },
        ]
        setInnerCornersRaw(projectFromRect(outerCorners, detectedInner, OUT_W, OUT_H))
      }

      const avgBorderPx = (bw.left + bw.right + bw.top + bw.bottom) / 4

      const surface      = analyzeSurface(warped, avgBorderPx)
      const edges        = analyzeEdges(warped, bw)
      const cornerResult = analyzeCorners(warped, avgBorderPx)
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
        widthMm: cardType.widthMm,
        heightMm: cardType.heightMm,
      }

      setAnalysisState({ status: 'done', result })
    } catch (err) {
      setAnalysisState({ status: 'error', message: err instanceof Error ? err.message : 'Analysis failed.' })
    }
  }, [imageUrl, outerCorners, innerCorners, innerCornersManual, imageDimensions, cardType])

  const reset = useCallback(() => {
    if (imageUrl) URL.revokeObjectURL(imageUrl)
    setImageFile(null)
    setImageUrl(null)
    setImageDimensions(null)
    setOuterCorners(null)
    setInnerCornersRaw(null)
    setInnerCornersManual(false)
    setBorderPercentRaw(8)
    setAnalysisState({ status: 'idle' })
  }, [imageUrl])

  return {
    imageFile, imageUrl, imageDimensions,
    outerCorners, innerCorners,
    borderPercent, cardType,
    analysisState,
    setImage,
    setOuterCorners,
    setInnerCorners,
    setBorderPercent,
    setCardType,
    analyze,
    reset,
  }
}
