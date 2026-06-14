'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import type { CardCorners } from '@/shared/types'

interface BorderAdjusterProps {
  imageUrl: string
  imageDimensions: { width: number; height: number }
  outerCorners: CardCorners
  innerCorners: CardCorners
  onOuterChange: (corners: CardCorners) => void
  onInnerChange: (corners: CardCorners) => void
}

const HIT_RADIUS = 18
const BRACKET_LEN = 14
const BRACKET_W = 2

// Outer quad = card physical edge (indigo)
const OUTER_LINE  = 'rgba(99, 102, 241, 0.85)'
const OUTER_FILL  = 'rgba(99, 102, 241, 0.05)'
// Inner quad = artwork boundary (yellow)
const INNER_LINE  = 'rgba(250, 204, 21, 0.85)'
const INNER_FILL  = 'rgba(250, 204, 21, 0.05)'
const ACTIVE_COLOR = '#ffffff'

type ActiveHandle = { quad: 'outer' | 'inner'; idx: number } | null

function drawBracket(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  idx: number,
  color: string,
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
  onInnerChange,
}: BorderAdjusterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)

  const [renderedSize, setRenderedSize] = useState<{
    width: number; height: number; offsetX: number; offsetY: number
  } | null>(null)

  const activeRef  = useRef<ActiveHandle>(null)
  const hoveredRef = useRef<ActiveHandle>(null)
  const rafRef     = useRef<number>(0)
  const [isDragging, setIsDragging] = useState(false)

  const computeRect = useCallback(() => {
    const c = containerRef.current
    if (!c) return null
    const cw = c.clientWidth
    const ch = c.clientHeight
    if (!cw || !ch) return null
    const { width: iw, height: ih } = imageDimensions
    const scale = Math.min(cw / iw, ch / ih)
    return {
      width:   iw * scale,
      height:  ih * scale,
      offsetX: (cw - iw * scale) / 2,
      offsetY: (ch - ih * scale) / 2,
    }
  }, [imageDimensions])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
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

  const drawQuad = useCallback((
    ctx: CanvasRenderingContext2D,
    corners: CardCorners,
    rs: NonNullable<typeof renderedSize>,
    lineColor: string,
    fillColor: string,
    quad: 'outer' | 'inner',
    dashed: boolean,
  ) => {
    const pts = corners.map(c => imgToCanvas(c, rs))

    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.fillStyle = fillColor
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.closePath()
    ctx.strokeStyle = lineColor
    ctx.lineWidth = 1.5
    ctx.setLineDash(dashed ? [5, 4] : [])
    ctx.stroke()
    ctx.setLineDash([])

    for (let i = 0; i < 4; i++) {
      const isActive =
        (activeRef.current?.quad  === quad && activeRef.current.idx  === i) ||
        (hoveredRef.current?.quad === quad && hoveredRef.current.idx === i)
      drawBracket(ctx, pts[i].x, pts[i].y, i, isActive ? ACTIVE_COLOR : lineColor)
    }
  }, [imgToCanvas])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const rs = renderedSize
    if (!canvas || !rs) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawQuad(ctx, outerCorners, rs, OUTER_LINE, OUTER_FILL, 'outer', false)
    drawQuad(ctx, innerCorners, rs, INNER_LINE, INNER_FILL, 'inner', true)
  }, [outerCorners, innerCorners, renderedSize, drawQuad])

  useEffect(() => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  const findHandle = useCallback((cx: number, cy: number): ActiveHandle => {
    if (!renderedSize) return null
    for (const [corners, quad] of [
      [innerCorners, 'inner'],
      [outerCorners, 'outer'],
    ] as const) {
      const pts = corners.map(c => imgToCanvas(c, renderedSize))
      for (let i = 0; i < 4; i++) {
        const dx = pts[i].x - cx
        const dy = pts[i].y - cy
        if (Math.sqrt(dx * dx + dy * dy) <= HIT_RADIUS) return { quad, idx: i }
      }
    }
    return null
  }, [outerCorners, innerCorners, renderedSize, imgToCanvas])

  const getXY = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { cx: e.clientX - r.left, cy: e.clientY - r.top }
  }

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { cx, cy } = getXY(e)
    const handle = findHandle(cx, cy)
    if (!handle) return
    activeRef.current = handle
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [findHandle])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!renderedSize) return
    const { cx, cy } = getXY(e)
    if (activeRef.current) {
      const { quad, idx } = activeRef.current
      const pt = canvasToImg(cx, cy, renderedSize)
      if (quad === 'outer') {
        const updated = [...outerCorners] as unknown as CardCorners
        updated[idx] = pt
        onOuterChange(updated)
      } else {
        const updated = [...innerCorners] as unknown as CardCorners
        updated[idx] = pt
        onInnerChange(updated)
      }
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(draw)
    } else {
      const prev = hoveredRef.current
      hoveredRef.current = findHandle(cx, cy)
      const changed =
        prev?.quad !== hoveredRef.current?.quad ||
        prev?.idx  !== hoveredRef.current?.idx
      if (changed) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(draw)
      }
    }
  }, [outerCorners, innerCorners, renderedSize, onOuterChange, onInnerChange, canvasToImg, findHandle, draw])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      activeRef.current = null
      setIsDragging(false)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(draw)
    }
  }, [draw])

  const onPointerLeave = useCallback(() => {
    if (hoveredRef.current) {
      hoveredRef.current = null
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
