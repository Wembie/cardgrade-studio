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

const HIT_RADIUS   = 16
const HANDLE_R     = 7

const OUTER_LINE   = 'rgba(99, 102, 241, 0.85)'
const OUTER_FILL   = 'rgba(99, 102, 241, 0.06)'
const OUTER_HANDLE = '#6366f1'
const INNER_LINE   = 'rgba(250, 204, 21, 0.85)'
const INNER_FILL   = 'rgba(250, 204, 21, 0.05)'
const INNER_HANDLE = '#facc15'
const ACTIVE_FILL  = '#ffffff'
const ACTIVE_RING  = '#ffffff'

type ActiveHandle = { quad: 'outer' | 'inner'; idx: number } | null

function normalizeVec(v: { x: number; y: number }): { x: number; y: number } {
  const len = Math.sqrt(v.x * v.x + v.y * v.y)
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len }
}

function drawCircleHandle(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  fill: string, ring: string,
  active: boolean,
) {
  ctx.beginPath()
  ctx.arc(x, y, HANDLE_R, 0, Math.PI * 2)
  ctx.fillStyle   = active ? ACTIVE_FILL : fill
  ctx.fill()
  ctx.strokeStyle = active ? ACTIVE_RING : ring
  ctx.lineWidth   = 2
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
    const c = containerRef.current; if (!c) return null
    const cw = c.clientWidth; const ch = c.clientHeight
    if (!cw || !ch) return null
    const { width: iw, height: ih } = imageDimensions
    const scale = Math.min(cw / iw, ch / ih)
    return { width: iw * scale, height: ih * scale, offsetX: (cw - iw * scale) / 2, offsetY: (ch - ih * scale) / 2 }
  }, [imageDimensions])

  useEffect(() => {
    const c = containerRef.current; if (!c) return
    const obs = new ResizeObserver(() => setRenderedSize(computeRect()))
    obs.observe(c); setRenderedSize(computeRect())
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
    line: string, fill: string, handle: string,
    quad: 'outer' | 'inner',
    dashed: boolean,
  ) => {
    const pts = corners.map(c => imgToCanvas(c, rs))
    const r = Math.min(rs.width, rs.height) * 0.04

    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const A     = pts[i]
      const P     = pts[(i + 3) % 4]
      const B     = pts[(i + 1) % 4]
      const dPrev = normalizeVec({ x: P.x - A.x, y: P.y - A.y })
      const dNext = normalizeVec({ x: B.x - A.x, y: B.y - A.y })
      const entry = { x: A.x + dPrev.x * r, y: A.y + dPrev.y * r }
      const exit  = { x: A.x + dNext.x * r, y: A.y + dNext.y * r }
      if (i === 0) ctx.moveTo(entry.x, entry.y)
      else ctx.lineTo(entry.x, entry.y)
      ctx.arcTo(A.x, A.y, exit.x, exit.y, r)
    }
    ctx.closePath()
    ctx.fillStyle = fill; ctx.fill()
    ctx.strokeStyle = line; ctx.lineWidth = 1.5
    ctx.setLineDash(dashed ? [5, 4] : [])
    ctx.stroke(); ctx.setLineDash([])

    for (let i = 0; i < 4; i++) {
      const isActive  = activeRef.current?.quad  === quad && activeRef.current.idx  === i
      const isHovered = hoveredRef.current?.quad === quad && hoveredRef.current.idx === i
      if (isActive || isHovered) {
        drawCircleHandle(ctx, pts[i].x, pts[i].y, handle, line, isActive)
      }
    }
  }, [imgToCanvas])

  const draw = useCallback(() => {
    const canvas = canvasRef.current; const rs = renderedSize
    if (!canvas || !rs) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    drawQuad(ctx, outerCorners, rs, OUTER_LINE, OUTER_FILL, OUTER_HANDLE, 'outer', false)
    drawQuad(ctx, innerCorners, rs, INNER_LINE, INNER_FILL, INNER_HANDLE, 'inner', true)
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
        const dx = pts[i].x - cx; const dy = pts[i].y - cy
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
    const handle = findHandle(cx, cy); if (!handle) return
    activeRef.current = handle; setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId); e.preventDefault()
  }, [findHandle])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!renderedSize) return
    const { cx, cy } = getXY(e)
    if (activeRef.current) {
      const { quad, idx } = activeRef.current
      const pt = canvasToImg(cx, cy, renderedSize)
      if (quad === 'outer') {
        const u = [...outerCorners] as unknown as CardCorners; u[idx] = pt; onOuterChange(u)
      } else {
        const u = [...innerCorners] as unknown as CardCorners; u[idx] = pt; onInnerChange(u)
      }
      cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(draw)
    } else {
      const prev = hoveredRef.current; hoveredRef.current = findHandle(cx, cy)
      if (prev?.quad !== hoveredRef.current?.quad || prev?.idx !== hoveredRef.current?.idx) {
        cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(draw)
      }
    }
  }, [outerCorners, innerCorners, renderedSize, onOuterChange, onInnerChange, canvasToImg, findHandle, draw])

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      activeRef.current = null; setIsDragging(false)
      cancelAnimationFrame(rafRef.current); rafRef.current = requestAnimationFrame(draw)
    }
  }, [draw])

  const onPointerLeave = useCallback(() => {
    if (hoveredRef.current) {
      hoveredRef.current = null
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
