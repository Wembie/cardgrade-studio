'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { CardCorners } from '@/shared/types'

interface BorderAdjusterProps {
  imageUrl: string
  imageDimensions: { width: number; height: number }
  corners: CardCorners
  onCornersChange: (corners: CardCorners) => void
}

const CORNER_LABELS = ['TL', 'TR', 'BR', 'BL'] as const
const HANDLE_RADIUS = 10
const HIT_RADIUS = 20
const QUAD_FILL = 'rgba(99, 102, 241, 0.1)'
const EDGE_COLOR = 'rgba(99, 102, 241, 0.8)'
const HANDLE_BORDER = 'rgba(99, 102, 241, 1)'
const HANDLE_HOVER_FILL = '#FACC15' // yellow-400

export function BorderAdjuster({
  imageUrl,
  imageDimensions,
  corners,
  onCornersChange,
}: BorderAdjusterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Rendered size of the image inside the container
  const [renderedSize, setRenderedSize] = useState<{ width: number; height: number; offsetX: number; offsetY: number } | null>(null)

  // Active corner being dragged (-1 = none)
  const activeCornerRef = useRef<number>(-1)
  const hoveredCornerRef = useRef<number>(-1)
  const rafRef = useRef<number>(0)
  const [isDragging, setIsDragging] = useState(false)

  // Compute the rendered image rect inside its container (object-fit: contain)
  const computeRenderedRect = useCallback(() => {
    const img = imgRef.current
    const container = containerRef.current
    if (!img || !container) return null

    const containerW = container.clientWidth
    const containerH = container.clientHeight
    const imgW = imageDimensions.width
    const imgH = imageDimensions.height

    const scale = Math.min(containerW / imgW, containerH / imgH)
    const renderedW = imgW * scale
    const renderedH = imgH * scale
    const offsetX = (containerW - renderedW) / 2
    const offsetY = (containerH - renderedH) / 2

    return { width: renderedW, height: renderedH, offsetX, offsetY }
  }, [imageDimensions])

  // Resize observer to track container size changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      const rect = computeRenderedRect()
      setRenderedSize(rect)
    })

    observer.observe(container)
    // Initial compute
    const rect = computeRenderedRect()
    setRenderedSize(rect)

    return () => observer.disconnect()
  }, [computeRenderedRect])

  // Convert image coords → canvas coords
  const imgToCanvas = useCallback(
    (pt: { x: number; y: number }, rs: NonNullable<typeof renderedSize>) => ({
      x: pt.x * (rs.width / imageDimensions.width) + rs.offsetX,
      y: pt.y * (rs.height / imageDimensions.height) + rs.offsetY,
    }),
    [imageDimensions],
  )

  // Convert canvas coords → image coords
  const canvasToImg = useCallback(
    (cx: number, cy: number, rs: NonNullable<typeof renderedSize>) => ({
      x: (cx - rs.offsetX) * (imageDimensions.width / rs.width),
      y: (cy - rs.offsetY) * (imageDimensions.height / rs.height),
    }),
    [imageDimensions],
  )

  // Draw the overlay
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const rs = renderedSize
    if (!canvas || !rs) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Map corners to canvas coords
    const pts = corners.map(c => imgToCanvas(c, rs))

    // Draw filled quadrilateral
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.fillStyle = QUAD_FILL
    ctx.fill()

    // Draw edges
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.strokeStyle = EDGE_COLOR
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw corner handles
    for (let i = 0; i < 4; i++) {
      const pt = pts[i]
      const isHovered = hoveredCornerRef.current === i
      const isActive = activeCornerRef.current === i

      ctx.beginPath()
      ctx.arc(pt.x, pt.y, HANDLE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = isHovered || isActive ? HANDLE_HOVER_FILL : '#ffffff'
      ctx.fill()
      ctx.strokeStyle = HANDLE_BORDER
      ctx.lineWidth = 3
      ctx.stroke()

      // Label
      ctx.font = 'bold 9px monospace'
      ctx.fillStyle = 'rgba(99, 102, 241, 1)'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Offset label away from center of the quad
      const cx = (pts[0].x + pts[1].x + pts[2].x + pts[3].x) / 4
      const cy = (pts[0].y + pts[1].y + pts[2].y + pts[3].y) / 4
      const dx = pt.x - cx
      const dy = pt.y - cy
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const labelX = pt.x + (dx / len) * (HANDLE_RADIUS + 8)
      const labelY = pt.y + (dy / len) * (HANDLE_RADIUS + 8)

      ctx.fillText(CORNER_LABELS[i], labelX, labelY)
    }
  }, [corners, renderedSize, imgToCanvas])

  // Redraw whenever corners or renderedSize change
  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  // Pointer event helpers
  const findCorner = useCallback(
    (cx: number, cy: number): number => {
      if (!renderedSize) return -1
      const pts = corners.map(c => imgToCanvas(c, renderedSize))
      for (let i = 0; i < 4; i++) {
        const dx = pts[i].x - cx
        const dy = pts[i].y - cy
        if (Math.sqrt(dx * dx + dy * dy) <= HIT_RADIUS) return i
      }
      return -1
    },
    [corners, renderedSize, imgToCanvas],
  )

  const getCanvasXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top }
  }

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { cx, cy } = getCanvasXY(e)
      const idx = findCorner(cx, cy)
      if (idx === -1) return
      activeCornerRef.current = idx
      setIsDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
    },
    [findCorner],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!renderedSize) return
      const { cx, cy } = getCanvasXY(e)

      if (activeCornerRef.current !== -1) {
        // Drag: update that corner
        const raw = canvasToImg(cx, cy, renderedSize)
        // Clamp to image bounds
        const clamped = {
          x: Math.max(0, Math.min(imageDimensions.width, raw.x)),
          y: Math.max(0, Math.min(imageDimensions.height, raw.y)),
        }
        const updated = [...corners] as unknown as CardCorners
        updated[activeCornerRef.current] = clamped
        onCornersChange(updated)
        // Trigger redraw
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(draw)
      } else {
        // Hover detection
        const prev = hoveredCornerRef.current
        hoveredCornerRef.current = findCorner(cx, cy)
        if (prev !== hoveredCornerRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(draw)
        }
      }
    },
    [corners, renderedSize, onCornersChange, canvasToImg, findCorner, draw, imageDimensions],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (activeCornerRef.current !== -1) {
        e.currentTarget.releasePointerCapture(e.pointerId)
        activeCornerRef.current = -1
        setIsDragging(false)
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(draw)
      }
    },
    [draw],
  )

  const onPointerLeave = useCallback(() => {
    if (hoveredCornerRef.current !== -1) {
      hoveredCornerRef.current = -1
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(draw)
    }
  }, [draw])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ height: 'min(65vh, 600px)', minHeight: '280px' }}
    >
      <img
        ref={imgRef}
        src={imageUrl}
        alt="Card to grade"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full no-select"
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      />
    </div>
  )
}
