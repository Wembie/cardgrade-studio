'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { CardCorners } from '@/shared/types'

interface BorderAdjusterProps {
  imageUrl: string
  imageDimensions: { width: number; height: number }
  outerCorners: CardCorners
  innerCorners: CardCorners   // computed — displayed only, not draggable
  onOuterChange: (corners: CardCorners) => void
}

const HIT_RADIUS   = 18
const BRACKET_LEN  = 14
const BRACKET_W    = 2.5

const OUTER_LINE  = 'rgba(99, 102, 241, 0.9)'
const OUTER_FILL  = 'rgba(99, 102, 241, 0.06)'
const INNER_LINE  = 'rgba(250, 204, 21, 0.75)'
const INNER_FILL  = 'rgba(250, 204, 21, 0.04)'
const ACTIVE_COLOR = '#ffffff'

function drawBracket(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, idx: number, color: string,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = BRACKET_W
  ctx.lineCap = 'square'
  ctx.beginPath()
  const L = BRACKET_LEN
  switch (idx) {
    case 0: ctx.moveTo(x + L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + L); break // TL
    case 1: ctx.moveTo(x - L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + L); break // TR
    case 2: ctx.moveTo(x - L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - L); break // BR
    case 3: ctx.moveTo(x + L, y); ctx.lineTo(x, y); ctx.lineTo(x, y - L); break // BL
  }
  ctx.stroke()
}

export function BorderAdjuster({
  imageUrl,
  imageDimensions,
  outerCorners,
  innerCorners,
  onOuterChange,
}: BorderAdjusterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)

  const [renderedSize, setRenderedSize] = useState<{
    width: number; height: number; offsetX: number; offsetY: number
  } | null>(null)

  const activeRef  = useRef<number>(-1)
  const hoveredRef = useRef<number>(-1)
  const rafRef     = useRef<number>(0)
  const [isDragging, setIsDragging] = useState(false)

  const computeRect = useCallback(() => {
    const c = containerRef.current
    if (!c) return null
    const cw = c.clientWidth; const ch = c.clientHeight
    if (!cw || !ch) return null
    const { width: iw, height: ih } = imageDimensions
    const scale = Math.min(cw / iw, ch / ih)
    return {
      width: iw * scale, height: ih * scale,
      offsetX: (cw - iw * scale) / 2,
      offsetY: (ch - ih * scale) / 2,
    }
  }, [imageDimensions])

  useEffect(() => {
    const c = containerRef.current; if (!c) return
    const obs = new ResizeObserver(() => setRenderedSize(computeRect()))
    obs.observe(c)
    setRenderedSize(computeRect())
    return () => obs.disconnect()
  }, [computeRect])

  const imgToCanvas = useCallback(
    (pt: { x: number; y: number }, rs: NonNullable<typeof renderedSize>) => ({
      x: pt.x * (rs.width  / imageDimensions.width)  + rs.offsetX,
      y: pt.y * (rs.height / imageDimensions.height) + rs.offsetY,
    }),
    [imageDimensions],
  )

  const canvasToImg = useCallback(
    (cx: number, cy: number, rs: NonNullable<typeof renderedSize>) => ({
      x: Math.max(0, Math.min(imageDimensions.width,  (cx - rs.offsetX) * (imageDimensions.width  / rs.width))),
      y: Math.max(0, Math.min(imageDimensions.height, (cy - rs.offsetY) * (imageDimensions.height / rs.height))),
    }),
    [imageDimensions],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current; const rs = renderedSize
    if (!canvas || !rs) return
    const ctx = canvas.getContext('2d'); if (!ctx) return

    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // ── Inner quad (computed, dashed, no handles) ─────────────────────────────
    const iPts = innerCorners.map(c => imgToCanvas(c, rs))
    ctx.beginPath()
    ctx.moveTo(iPts[0].x, iPts[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(iPts[i].x, iPts[i].y)
    ctx.closePath()
    ctx.fillStyle = INNER_FILL; ctx.fill()
    ctx.strokeStyle = INNER_LINE; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
    ctx.stroke(); ctx.setLineDash([])

    // ── Outer quad (draggable) ─────────────────────────────────────────────────
    const oPts = outerCorners.map(c => imgToCanvas(c, rs))
    ctx.beginPath()
    ctx.moveTo(oPts[0].x, oPts[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(oPts[i].x, oPts[i].y)
    ctx.closePath()
    ctx.fillStyle = OUTER_FILL; ctx.fill()
    ctx.strokeStyle = OUTER_LINE; ctx.lineWidth = 1.5; ctx.setLineDash([])
    ctx.stroke()

    for (let i = 0; i < 4; i++) {
      const isActive  = activeRef.current  === i
      const isHovered = hoveredRef.current === i
      drawBracket(ctx, oPts[i].x, oPts[i].y, i, isActive || isHovered ? ACTIVE_COLOR : OUTER_LINE)
    }
  }, [outerCorners, innerCorners, renderedSize, imgToCanvas])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  const findCorner = useCallback((cx: number, cy: number): number => {
    if (!renderedSize) return -1
    const pts = outerCorners.map(c => imgToCanvas(c, renderedSize))
    for (let i = 0; i < 4; i++) {
      const dx = pts[i].x - cx; const dy = pts[i].y - cy
      if (Math.sqrt(dx * dx + dy * dy) <= HIT_RADIUS) return i
    }
    return -1
  }, [outerCorners, renderedSize, imgToCanvas])

  const getXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { cx: e.clientX - r.left, cy: e.clientY - r.top }
  }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { cx, cy } = getXY(e)
    const idx = findCorner(cx, cy)
    if (idx === -1) return
    activeRef.current = idx; setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault()
  }, [findCorner])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!renderedSize) return
    const { cx, cy } = getXY(e)
    if (activeRef.current !== -1) {
      const updated = [...outerCorners] as unknown as CardCorners
      updated[activeRef.current] = canvasToImg(cx, cy, renderedSize)
      onOuterChange(updated)
      cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(draw)
    } else {
      const prev = hoveredRef.current
      hoveredRef.current = findCorner(cx, cy)
      if (prev !== hoveredRef.current) {
        cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(draw)
      }
    }
  }, [outerCorners, renderedSize, onOuterChange, canvasToImg, findCorner, draw])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeRef.current !== -1) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      activeRef.current = -1; setIsDragging(false)
      cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(draw)
    }
  }, [draw])

  const onPointerLeave = useCallback(() => {
    if (hoveredRef.current !== -1) {
      hoveredRef.current = -1
      cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(draw)
    }
  }, [draw])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl bg-black"
      style={{ height: 'min(65vh, 600px)', minHeight: '280px' }}
    >
      <img
        src={imageUrl}
        alt="Card to grade"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: isDragging ? 'grabbing' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      />
    </div>
  )
}
