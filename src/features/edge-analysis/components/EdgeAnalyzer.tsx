'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/shared/lib/utils'
import type { EdgeAnalysis, EdgeCondition, CornerCondition, EdgeSide, CornerPosition } from '@/shared/types'

interface EdgeAnalyzerProps {
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  analysis: EdgeAnalysis
  className?: string
}

const EDGE_LABELS: Record<EdgeSide, string> = {
  top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right',
}
const CORNER_LABELS: Record<CornerPosition, string> = {
  topLeft: 'Top Left', topRight: 'Top Right',
  bottomLeft: 'Bottom Left', bottomRight: 'Bottom Right',
}

// Corner positions as % of image for zoom overlays
const CORNER_POS: Record<CornerPosition, { x: number; y: number }> = {
  topLeft:     { x: 0,   y: 0   },
  topRight:    { x: 100, y: 0   },
  bottomLeft:  { x: 0,   y: 100 },
  bottomRight: { x: 100, y: 100 },
}

export default function EdgeAnalyzer({
  imageDataUrl,
  analysis,
  className,
}: EdgeAnalyzerProps) {
  const [activeCorner, setActiveCorner] = useState<CornerPosition | null>(null)
  const { edges, corners, edgeScore, cornerScore } = analysis

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Summary scores */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard label="Edge Score" value={edgeScore} />
        <ScoreCard label="Corner Score" value={cornerScore} />
      </div>

      {/* Card visual with corner/edge highlights */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-black/30 aspect-[63/88] max-h-[320px] mx-auto w-full">
        <img
          src={imageDataUrl}
          alt="Card edges"
          className="w-full h-full object-contain"
          draggable={false}
        />

        {/* Corner hit zones */}
        {(Object.keys(CORNER_POS) as CornerPosition[]).map((pos) => {
          const corner = corners[pos]
          const loc = CORNER_POS[pos]
          const color = cornerScoreColor(corner.score)
          return (
            <button
              key={pos}
              onClick={() => setActiveCorner(activeCorner === pos ? null : pos)}
              className={cn(
                'absolute w-16 h-16 rounded transition-all duration-150',
                'border-2 flex items-center justify-center',
                activeCorner === pos ? 'opacity-90' : 'opacity-60 hover:opacity-90',
              )}
              style={{
                left: loc.x === 0 ? 0 : undefined,
                right: loc.x === 100 ? 0 : undefined,
                top: loc.y === 0 ? 0 : undefined,
                bottom: loc.y === 100 ? 0 : undefined,
                borderColor: color,
                background: `${color}18`,
              }}
              title={CORNER_LABELS[pos]}
            >
              <span className="text-xs font-bold tabular" style={{ color }}>
                {corner.score.toFixed(1)}
              </span>
            </button>
          )
        })}

        {/* Edge score strips */}
        <div
          className="absolute left-16 right-16 h-1.5 rounded-full top-0"
          style={{ background: edgeBarColor(edges.top.score) + '60' }}
          title={`Top edge: ${edges.top.score}`}
        />
        <div
          className="absolute left-16 right-16 h-1.5 rounded-full bottom-0"
          style={{ background: edgeBarColor(edges.bottom.score) + '60' }}
        />
        <div
          className="absolute top-16 bottom-16 w-1.5 rounded-full left-0"
          style={{ background: edgeBarColor(edges.left.score) + '60' }}
        />
        <div
          className="absolute top-16 bottom-16 w-1.5 rounded-full right-0"
          style={{ background: edgeBarColor(edges.right.score) + '60' }}
        />
      </div>

      {/* Active corner detail */}
      {activeCorner && (
        <motion.div
          key={activeCorner}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-xl p-4 space-y-2"
        >
          <div className="text-sm font-medium">{CORNER_LABELS[activeCorner]} — Detail</div>
          <CornerDetail corner={corners[activeCorner]} />
        </motion.div>
      )}

      {/* Edges breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Edge Breakdown
        </div>
        {(Object.keys(edges) as EdgeSide[]).map((side) => (
          <EdgeRow key={side} label={EDGE_LABELS[side]} edge={edges[side]} />
        ))}
      </div>

      {/* Corners breakdown */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Corner Breakdown
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(corners) as CornerPosition[]).map((pos) => (
            <CornerCard
              key={pos}
              label={CORNER_LABELS[pos]}
              corner={corners[pos]}
              active={activeCorner === pos}
              onClick={() => setActiveCorner(activeCorner === pos ? null : pos)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const color = cornerScoreColor(value)
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center surface-highlight">
      <div className="text-3xl font-black tabular" style={{ color }}>
        {value.toFixed(1)}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function EdgeRow({ label, edge }: { label: string; edge: EdgeCondition }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card/50">
      <span className="text-sm text-muted-foreground w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 space-y-1">
        <MetricBar label="Whitening" value={edge.whiteningRatio} invert />
        <MetricBar label="Roughness" value={edge.roughness} invert />
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-lg font-bold tabular" style={{ color: cornerScoreColor(edge.score) }}>
          {edge.score.toFixed(1)}
        </div>
        {edge.chipCount > 0 && (
          <div className="text-xs text-amber-400">{edge.chipCount} chip{edge.chipCount > 1 ? 's' : ''}</div>
        )}
      </div>
    </div>
  )
}

function CornerCard({
  label, corner, active, onClick
}: { label: string; corner: CornerCondition; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
        active ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-border bg-card/50 hover:bg-secondary/30'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-black tabular" style={{ color: cornerScoreColor(corner.score) }}>
          {corner.score.toFixed(1)}
        </span>
      </div>
      {corner.dinged && (
        <div className="text-xs text-red-400 flex items-center gap-1">
          ⚠ Ding detected
        </div>
      )}
      {corner.whitening > 0.1 && (
        <div className="text-xs text-amber-400">
          {Math.round(corner.whitening * 100)}% whitening
        </div>
      )}
    </button>
  )
}

function CornerDetail({ corner }: { corner: CornerCondition }) {
  return (
    <div className="space-y-2 text-sm">
      <MetricRow label="Sharpness"  value={corner.sharpness}  good />
      <MetricRow label="Whitening"  value={corner.whitening}  good={false} />
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground w-24">Ding</span>
        <span className={corner.dinged ? 'text-red-400' : 'text-emerald-400'}>
          {corner.dinged ? 'Detected' : 'None'}
        </span>
      </div>
    </div>
  )
}

function MetricRow({ label, value, good = true }: { label: string; value: number; good?: boolean }) {
  const displayVal = Math.round(value * 100)
  const color = good
    ? (displayVal >= 80 ? '#10B981' : displayVal >= 50 ? '#F59E0B' : '#EF4444')
    : (displayVal <= 20 ? '#10B981' : displayVal <= 50 ? '#F59E0B' : '#EF4444')
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-24">{label}</span>
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${displayVal}%`, background: color }} />
      </div>
      <span className="text-xs tabular w-8 text-right" style={{ color }}>
        {displayVal}%
      </span>
    </div>
  )
}

function MetricBar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const pct = Math.round(value * 100)
  const score = invert ? 1 - value : value
  const color = score >= 0.8 ? '#10B981' : score >= 0.5 ? '#F59E0B' : '#EF4444'
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="tabular w-6 text-right" style={{ color }}>{pct}%</span>
    </div>
  )
}

function cornerScoreColor(score: number): string {
  if (score >= 9.5) return '#00D2FF'
  if (score >= 8)   return '#10B981'
  if (score >= 6)   return '#84CC16'
  if (score >= 4)   return '#F59E0B'
  return '#EF4444'
}

function edgeBarColor(score: number): string {
  return cornerScoreColor(score)
}
