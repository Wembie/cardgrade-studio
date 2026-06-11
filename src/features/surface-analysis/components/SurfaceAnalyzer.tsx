'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/components/ui/badge'
import type { SurfaceAnalysis, SurfaceDefect } from '@/shared/types'

interface SurfaceAnalyzerProps {
  imageDataUrl: string
  imageWidth: number
  imageHeight: number
  analysis: SurfaceAnalysis
  className?: string
}

const DEFECT_TYPE_LABELS: Record<string, string> = {
  scratch: 'Scratch',
  whitening: 'Whitening',
  print_defect: 'Print Defect',
  stain: 'Stain',
  crease: 'Crease',
  ink_loss: 'Ink Loss',
  surface_wear: 'Surface Wear',
}

const SEVERITY_COLORS = {
  minor:    { badge: 'warning' as const, dot: 'bg-amber-400', border: 'border-amber-500/50' },
  moderate: { badge: 'destructive' as const, dot: 'bg-orange-400', border: 'border-orange-500/50' },
  major:    { badge: 'destructive' as const, dot: 'bg-red-400', border: 'border-red-500/60' },
}

export default function SurfaceAnalyzer({
  imageDataUrl,
  imageWidth,
  imageHeight,
  analysis,
  className,
}: SurfaceAnalyzerProps) {
  const [showOverlay, setShowOverlay] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [selectedDefect, setSelectedDefect] = useState<SurfaceDefect | null>(null)

  const { defects, whiteningScore, scratchScore, printQualityScore, overallScore, heatmap } = analysis

  const scores = [
    { label: 'Overall',    value: overallScore,      color: scoreColor(overallScore) },
    { label: 'Whitening',  value: whiteningScore,    color: scoreColor(whiteningScore) },
    { label: 'Scratches',  value: scratchScore,      color: scoreColor(scratchScore) },
    { label: 'Print',      value: printQualityScore, color: scoreColor(printQualityScore) },
  ]

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Score row */}
      <div className="grid grid-cols-4 gap-2">
        {scores.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3 text-center surface-highlight">
            <div className={cn('text-2xl font-black tabular', s.color)}>{s.value.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Image with overlay */}
      <div className="relative rounded-xl overflow-hidden border border-border bg-black/30">
        <img
          src={imageDataUrl}
          alt="Card surface"
          className="w-full object-contain max-h-[340px]"
          draggable={false}
        />

        {/* Defect overlays */}
        {showOverlay && !showHeatmap && (
          <div className="absolute inset-0 pointer-events-none">
            {defects.map((defect) => {
              const colors = SEVERITY_COLORS[defect.severity]
              return (
                <div
                  key={defect.id}
                  className={cn(
                    'absolute rounded pointer-events-auto cursor-pointer',
                    'border transition-all duration-150',
                    colors.border,
                    defect === selectedDefect
                      ? 'bg-red-500/25 ring-1 ring-red-400'
                      : 'bg-red-500/10 hover:bg-red-500/20'
                  )}
                  style={{
                    left: `${defect.bounds.x * 100}%`,
                    top: `${defect.bounds.y * 100}%`,
                    width: `${defect.bounds.w * 100}%`,
                    height: `${defect.bounds.h * 100}%`,
                  }}
                  onClick={() => setSelectedDefect(defect === selectedDefect ? null : defect)}
                  title={`${DEFECT_TYPE_LABELS[defect.type]} (${defect.severity})`}
                />
              )
            })}
          </div>
        )}

        {/* Heatmap overlay */}
        {showHeatmap && heatmap && (
          <HeatmapOverlay heatmap={heatmap} />
        )}

        {/* Toolbar */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={cn(
              'px-2 py-1 rounded text-xs border flex items-center gap-1 transition-colors',
              showOverlay
                ? 'bg-red-500/20 border-red-500/30 text-red-300'
                : 'bg-black/60 border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {showOverlay ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            Defects
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={cn(
              'px-2 py-1 rounded text-xs border flex items-center gap-1 transition-colors',
              showHeatmap
                ? 'bg-orange-500/20 border-orange-500/30 text-orange-300'
                : 'bg-black/60 border-border text-muted-foreground hover:text-foreground'
            )}
          >
            Heatmap
          </button>
        </div>

        {/* No defects indicator */}
        {defects.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/70 border border-emerald-500/30 rounded-lg px-4 py-2 text-emerald-400 text-sm font-medium">
              No significant defects detected
            </div>
          </div>
        )}
      </div>

      {/* Selected defect tooltip */}
      <AnimatePresence>
        {selectedDefect && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="bg-card border border-border rounded-lg p-3 text-sm"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{DEFECT_TYPE_LABELS[selectedDefect.type]}</span>
                  <Badge variant={SEVERITY_COLORS[selectedDefect.severity].badge} className="capitalize text-xs">
                    {selectedDefect.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {Math.round(selectedDefect.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedDefect.description}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Defect list */}
      {defects.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Detected Defects ({defects.length})
          </div>
          {defects.map((d) => {
            const colors = SEVERITY_COLORS[d.severity]
            return (
              <button
                key={d.id}
                onClick={() => setSelectedDefect(d === selectedDefect ? null : d)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left text-sm transition-colors',
                  d === selectedDefect
                    ? 'bg-card border-primary/30'
                    : 'border-border hover:border-border hover:bg-secondary/30'
                )}
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', colors.dot)} />
                <span className="flex-1 text-foreground">{DEFECT_TYPE_LABELS[d.type]}</span>
                <Badge variant={colors.badge} className="capitalize text-xs">{d.severity}</Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function HeatmapOverlay({ heatmap }: { heatmap: number[][] }) {
  const rows = heatmap.length
  const cols = heatmap[0]?.length ?? 0
  if (!rows || !cols) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {heatmap.map((row, r) =>
        row.map((val, c) => {
          if (val < 0.05) return null
          const alpha = val * 0.7
          return (
            <div
              key={`${r}-${c}`}
              style={{
                position: 'absolute',
                left: `${(c / cols) * 100}%`,
                top: `${(r / rows) * 100}%`,
                width: `${(1 / cols) * 100}%`,
                height: `${(1 / rows) * 100}%`,
                background:
                  val > 0.7
                    ? `rgba(239,68,68,${alpha})`
                    : val > 0.4
                    ? `rgba(245,158,11,${alpha})`
                    : `rgba(99,102,241,${alpha * 0.6})`,
              }}
            />
          )
        })
      )}
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 9.5) return 'text-cyan-400'
  if (score >= 8)   return 'text-emerald-400'
  if (score >= 6)   return 'text-lime-400'
  if (score >= 4)   return 'text-amber-400'
  return 'text-red-400'
}
