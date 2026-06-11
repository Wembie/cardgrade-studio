'use client'

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Move, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react'
import { cn, clamp } from '@/shared/lib/utils'
import { recalculateCentering } from '@/cv/centering-analyzer'
import type { CenteringMeasurement } from '@/shared/types'

interface CenteringToolProps {
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  initialCentering?: CenteringMeasurement | null
  onCenteringChange: (centering: CenteringMeasurement) => void
  className?: string
}

type DragTarget = 'left' | 'right' | 'top' | 'bottom' | null

const LINE_HIT_ZONE = 12  // px clickable area around line

export default function CenteringTool({
  imageDataUrl,
  imageWidth,
  imageHeight,
  initialCentering,
  onCenteringChange,
  className,
}: CenteringToolProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 600, h: 400 })

  // Centering line positions in image-space pixels
  const [lines, setLines] = useState(() => {
    if (initialCentering) {
      const b = initialCentering.borders
      return {
        left: b.left,
        right: b.cardWidth - b.right,
        top: b.top,
        bottom: b.cardHeight - b.bottom,
      }
    }
    return {
      left: Math.round(imageWidth * 0.1),
      right: Math.round(imageWidth * 0.9),
      top: Math.round(imageHeight * 0.1),
      bottom: Math.round(imageHeight * 0.9),
    }
  })

  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState<DragTarget>(null)
  const [isPanning, setIsPanning] = useState(false)
  const lastMousePos = useRef({ x: 0, y: 0 })

  // Scale factor: image pixels → screen pixels
  const scale = useMemo(() => {
    const scaleX = containerSize.w / imageWidth
    const scaleY = containerSize.h / imageHeight
    return Math.min(scaleX, scaleY) * zoom
  }, [containerSize, imageWidth, imageHeight, zoom])

  // Image display dimensions in screen pixels
  const dispW = imageWidth * scale
  const dispH = imageHeight * scale
  const offsetX = (containerSize.w - dispW) / 2 + pan.x
  const offsetY = (containerSize.h - dispH) / 2 + pan.y

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setContainerSize({ w: width, h: height })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Update centering measurement whenever lines change
  useEffect(() => {
    const centering = recalculateCentering(
      lines.left, lines.right, lines.top, lines.bottom,
      imageWidth, imageHeight
    )
    onCenteringChange(centering)
  }, [lines, imageWidth, imageHeight, onCenteringChange])

  // Convert screen coordinates to image coordinates
  const screenToImage = useCallback((sx: number, sy: number) => {
    return {
      x: (sx - offsetX) / scale,
      y: (sy - offsetY) / scale,
    }
  }, [offsetX, offsetY, scale])

  // Convert image coordinates to screen coordinates
  const imageToScreen = useCallback((ix: number, iy: number) => {
    return {
      x: ix * scale + offsetX,
      y: iy * scale + offsetY,
    }
  }, [scale, offsetX, offsetY])

  const getLineScreenPositions = useCallback(() => ({
    left:   imageToScreen(lines.left, 0).x,
    right:  imageToScreen(lines.right, 0).x,
    top:    imageToScreen(0, lines.top).y,
    bottom: imageToScreen(0, lines.bottom).y,
  }), [lines, imageToScreen])

  const hitTestLine = useCallback((sx: number, sy: number): DragTarget => {
    const pos = getLineScreenPositions()
    const imgStart = imageToScreen(0, 0)
    const imgEnd = imageToScreen(imageWidth, imageHeight)

    // Check vertical lines (left/right) — only within image bounds vertically
    if (sy >= imgStart.y && sy <= imgEnd.y) {
      if (Math.abs(sx - pos.left) <= LINE_HIT_ZONE) return 'left'
      if (Math.abs(sx - pos.right) <= LINE_HIT_ZONE) return 'right'
    }
    // Check horizontal lines (top/bottom) — only within image bounds horizontally
    if (sx >= imgStart.x && sx <= imgEnd.x) {
      if (Math.abs(sy - pos.top) <= LINE_HIT_ZONE) return 'top'
      if (Math.abs(sy - pos.bottom) <= LINE_HIT_ZONE) return 'bottom'
    }
    return null
  }, [getLineScreenPositions, imageToScreen, imageWidth, imageHeight])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top

    const hit = hitTestLine(sx, sy)
    if (hit) {
      e.preventDefault()
      setDragging(hit)
    } else {
      setIsPanning(true)
    }
    lastMousePos.current = { x: sx, y: sy }
  }, [hitTestLine])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const dx = sx - lastMousePos.current.x
    const dy = sy - lastMousePos.current.y
    lastMousePos.current = { x: sx, y: sy }

    if (dragging) {
      const imgPos = screenToImage(sx, sy)
      setLines((prev) => {
        const margin = 4
        switch (dragging) {
          case 'left':
            return { ...prev, left: clamp(imgPos.x, margin, prev.right - margin) }
          case 'right':
            return { ...prev, right: clamp(imgPos.x, prev.left + margin, imageWidth - margin) }
          case 'top':
            return { ...prev, top: clamp(imgPos.y, margin, prev.bottom - margin) }
          case 'bottom':
            return { ...prev, bottom: clamp(imgPos.y, prev.top + margin, imageHeight - margin) }
          default:
            return prev
        }
      })
    } else if (isPanning) {
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
    }
  }, [dragging, isPanning, screenToImage, imageWidth, imageHeight])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((z) => clamp(z * factor, 0.3, 8))
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const resetLines = useCallback(() => {
    setLines({
      left: Math.round(imageWidth * 0.1),
      right: Math.round(imageWidth * 0.9),
      top: Math.round(imageHeight * 0.1),
      bottom: Math.round(imageHeight * 0.9),
    })
  }, [imageWidth, imageHeight])

  // Cursor style based on hover/drag state
  const [hoverTarget, setHoverTarget] = useState<DragTarget>(null)
  const handleMouseMoveForCursor = useCallback((e: React.MouseEvent) => {
    if (dragging) return
    const rect = containerRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    setHoverTarget(hitTestLine(sx, sy))
  }, [dragging, hitTestLine])

  const getCursor = () => {
    const target = dragging || hoverTarget
    if (target === 'left' || target === 'right') return 'cursor-col-resize'
    if (target === 'top' || target === 'bottom') return 'cursor-row-resize'
    if (isPanning) return 'cursor-grabbing'
    return 'cursor-grab'
  }

  const screenLines = getLineScreenPositions()

  // Centering measurement labels
  const borderL = lines.left
  const borderR = imageWidth - lines.right
  const borderT = lines.top
  const borderB = imageHeight - lines.bottom
  const totalLR = borderL + borderR
  const totalTB = borderT + borderB
  const lrPct = totalLR > 0 ? Math.round((borderL / totalLR) * 100) : 50
  const tbPct = totalTB > 0 ? Math.round((borderT / totalTB) * 100) : 50

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
          <button
            onClick={() => setZoom((z) => clamp(z * 1.25, 0.3, 8))}
            className="p-1.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs tabular text-muted-foreground px-1 min-w-[40px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => clamp(z * 0.8, 0.3, 8))}
            className="p-1.5 hover:bg-background rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={resetView}
          className="p-1.5 bg-secondary hover:bg-secondary/80 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Reset view"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetLines}
          className="p-1.5 bg-secondary hover:bg-secondary/80 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Reset lines"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <div className="ml-auto flex items-center gap-3 text-xs tabular">
          <span className="text-muted-foreground">
            L/R{' '}
            <span className="text-foreground font-medium">{lrPct}/{100 - lrPct}</span>
          </span>
          <span className="text-muted-foreground">
            T/B{' '}
            <span className="text-foreground font-medium">{tbPct}/{100 - tbPct}</span>
          </span>
        </div>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-xl border border-border bg-black/40',
          'h-[420px] select-none',
          getCursor()
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={(e) => { handleMouseMove(e); handleMouseMoveForCursor(e) }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Checkerboard background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'repeating-conic-gradient(#1a1a2e 0% 25%, #111122 0% 50%)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Card image */}
        <img
          src={imageDataUrl}
          alt="Card"
          draggable={false}
          style={{
            position: 'absolute',
            left: offsetX,
            top: offsetY,
            width: dispW,
            height: dispH,
            imageRendering: zoom > 3 ? 'pixelated' : 'auto',
          }}
        />

        {/* Measurement zone fills (colored regions) */}
        {/* Left border */}
        <div
          style={{
            position: 'absolute',
            left: offsetX,
            top: offsetY,
            width: lines.left * scale,
            height: dispH,
            background: 'rgba(99, 102, 241, 0.08)',
            borderRight: '1px dashed rgba(99, 102, 241, 0.3)',
            pointerEvents: 'none',
          }}
        />
        {/* Right border */}
        <div
          style={{
            position: 'absolute',
            left: offsetX + lines.right * scale,
            top: offsetY,
            width: dispW - lines.right * scale,
            height: dispH,
            background: 'rgba(99, 102, 241, 0.08)',
            borderLeft: '1px dashed rgba(99, 102, 241, 0.3)',
            pointerEvents: 'none',
          }}
        />
        {/* Top border */}
        <div
          style={{
            position: 'absolute',
            left: offsetX,
            top: offsetY,
            width: dispW,
            height: lines.top * scale,
            background: 'rgba(139, 92, 246, 0.08)',
            borderBottom: '1px dashed rgba(139, 92, 246, 0.3)',
            pointerEvents: 'none',
          }}
        />
        {/* Bottom border */}
        <div
          style={{
            position: 'absolute',
            left: offsetX,
            top: offsetY + lines.bottom * scale,
            width: dispW,
            height: dispH - lines.bottom * scale,
            background: 'rgba(139, 92, 246, 0.08)',
            borderTop: '1px dashed rgba(139, 92, 246, 0.3)',
            pointerEvents: 'none',
          }}
        />

        {/* Left centering line */}
        <div
          className={cn('centering-line vertical', dragging === 'left' && 'dragging')}
          style={{
            left: screenLines.left,
            top: offsetY,
            height: dispH,
            transition: dragging === 'left' ? 'none' : 'left 0.05s',
          }}
        />
        {/* Right centering line */}
        <div
          className={cn('centering-line vertical', dragging === 'right' && 'dragging')}
          style={{
            left: screenLines.right,
            top: offsetY,
            height: dispH,
            transition: dragging === 'right' ? 'none' : 'left 0.05s',
          }}
        />
        {/* Top centering line */}
        <div
          className={cn('centering-line horizontal', dragging === 'top' && 'dragging')}
          style={{
            top: screenLines.top,
            left: offsetX,
            width: dispW,
            transition: dragging === 'top' ? 'none' : 'top 0.05s',
          }}
        />
        {/* Bottom centering line */}
        <div
          className={cn('centering-line horizontal', dragging === 'bottom' && 'dragging')}
          style={{
            top: screenLines.bottom,
            left: offsetX,
            width: dispW,
            transition: dragging === 'bottom' ? 'none' : 'top 0.05s',
          }}
        />

        {/* Measurement labels */}
        {/* Left border label */}
        <div
          style={{
            position: 'absolute',
            left: offsetX + (lines.left * scale) / 2,
            top: offsetY + dispH / 2,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          className="bg-black/70 border border-indigo-500/40 rounded px-1.5 py-0.5 text-xs tabular text-indigo-300 whitespace-nowrap"
        >
          {Math.round(borderL)}px
        </div>
        {/* Right border label */}
        <div
          style={{
            position: 'absolute',
            left: offsetX + lines.right * scale + (dispW - lines.right * scale) / 2,
            top: offsetY + dispH / 2,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          className="bg-black/70 border border-indigo-500/40 rounded px-1.5 py-0.5 text-xs tabular text-indigo-300 whitespace-nowrap"
        >
          {Math.round(borderR)}px
        </div>
        {/* Top border label */}
        <div
          style={{
            position: 'absolute',
            left: offsetX + dispW / 2,
            top: offsetY + (lines.top * scale) / 2,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          className="bg-black/70 border border-violet-500/40 rounded px-1.5 py-0.5 text-xs tabular text-violet-300 whitespace-nowrap"
        >
          {Math.round(borderT)}px
        </div>
        {/* Bottom border label */}
        <div
          style={{
            position: 'absolute',
            left: offsetX + dispW / 2,
            top: offsetY + lines.bottom * scale + (dispH - lines.bottom * scale) / 2,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
          className="bg-black/70 border border-violet-500/40 rounded px-1.5 py-0.5 text-xs tabular text-violet-300 whitespace-nowrap"
        >
          {Math.round(borderB)}px
        </div>

        {/* Ratio display overlay (bottom center) */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/80 border border-border rounded-lg px-4 py-2 backdrop-blur-sm pointer-events-none">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">Left/Right</div>
            <div className={cn('text-base font-bold tabular', getCenteringColor(Math.abs(lrPct - 50)))}>
              {lrPct}/{100 - lrPct}
            </div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-0.5">Top/Bottom</div>
            <div className={cn('text-base font-bold tabular', getCenteringColor(Math.abs(tbPct - 50)))}>
              {tbPct}/{100 - tbPct}
            </div>
          </div>
        </div>

        {/* Drag hint */}
        {dragging && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-xs rounded px-2 py-1 pointer-events-none">
            Dragging {dragging} border
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center">
        Drag the colored lines to align with the card's printed border. Scroll to zoom.
      </p>
    </div>
  )
}

function getCenteringColor(deviation: number): string {
  if (deviation <= 2) return 'text-cyan-400'
  if (deviation <= 5) return 'text-emerald-400'
  if (deviation <= 10) return 'text-lime-400'
  if (deviation <= 15) return 'text-amber-400'
  return 'text-red-400'
}
