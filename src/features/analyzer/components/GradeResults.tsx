'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { AnalysisResult, GradeResult } from '@/shared/types'

interface GradeResultsProps {
  result: AnalysisResult
}

// ── Grade color by numeric value ──────────────────────────────────────────────

function gradeColor(numeric: number): string {
  if (numeric >= 10)  return 'text-yellow-400'
  if (numeric >= 9)   return 'text-green-400'
  if (numeric >= 8)   return 'text-blue-400'
  if (numeric >= 7)   return 'text-cyan-400'
  return 'text-muted-foreground'
}

function gradeRingColor(numeric: number): string {
  if (numeric >= 10)  return 'ring-yellow-400/30 border-yellow-400/20'
  if (numeric >= 9)   return 'ring-green-400/30 border-green-400/20'
  if (numeric >= 8)   return 'ring-blue-400/30 border-blue-400/20'
  if (numeric >= 7)   return 'ring-cyan-400/30 border-cyan-400/20'
  return 'ring-border border-border'
}

// ── Company badge configs ─────────────────────────────────────────────────────

const COMPANIES = [
  {
    key: 'psa' as const,
    name: 'PSA',
    bg: 'bg-red-600',
    text: 'text-white',
  },
  {
    key: 'bgs' as const,
    name: 'BGS',
    bg: 'bg-blue-700',
    text: 'text-white',
  },
  {
    key: 'cgc' as const,
    name: 'CGC',
    bg: 'bg-amber-700',
    text: 'text-white',
  },
  {
    key: 'sgc' as const,
    name: 'SGC',
    bg: 'bg-emerald-800',
    text: 'text-white',
  },
]

// ── Sub-component: single company grade card ──────────────────────────────────

function CompanyGradeCard({
  name,
  bg,
  text,
  gradeResult,
  delay,
}: {
  name: string
  bg: string
  text: string
  gradeResult: GradeResult
  delay: number
}) {
  const colorClass = gradeColor(gradeResult.numeric)
  const ringClass = gradeRingColor(gradeResult.numeric)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border bg-card surface-highlight p-4 ring-1 ${ringClass} flex flex-col gap-3`}
    >
      {/* Company badge */}
      <div className="flex items-center gap-2">
        <div
          className={`px-2.5 py-0.5 rounded-md text-xs font-black tracking-wider ${bg} ${text}`}
        >
          {name}
        </div>
      </div>

      {/* Grade number */}
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-black tabular leading-none ${colorClass}`}>
          {gradeResult.numeric % 1 === 0
            ? gradeResult.numeric.toString()
            : gradeResult.numeric.toFixed(1)}
        </span>
      </div>

      {/* Grade label */}
      <p className="text-xs text-muted-foreground leading-tight">{gradeResult.label}</p>
    </motion.div>
  )
}

// ── Sub-component: progress bar row ──────────────────────────────────────────

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 text-right tabular">
        {Math.round(value)}
      </span>
    </div>
  )
}

// ── Sub-component: edge scores row ───────────────────────────────────────────

function EdgeScores({ scores }: { scores: [number, number, number, number] }) {
  const labels = ['Left', 'Right', 'Top', 'Bottom']
  return (
    <div className="grid grid-cols-2 gap-2">
      {scores.map((score, i) => (
        <div key={labels[i]} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-1.5">
          <span className="text-xs text-muted-foreground">{labels[i]}</span>
          <span className="text-xs font-mono font-semibold text-foreground tabular">{Math.round(score)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Sub-component: corner scores row ─────────────────────────────────────────

function CornerScores({ scores }: { scores: [number, number, number, number] }) {
  const labels = ['TL', 'TR', 'BR', 'BL']
  return (
    <div className="grid grid-cols-4 gap-2">
      {scores.map((score, i) => (
        <div key={labels[i]} className="flex flex-col items-center gap-0.5 bg-secondary/50 rounded-lg px-2 py-2">
          <span className="text-xs text-muted-foreground">{labels[i]}</span>
          <span className="text-sm font-mono font-bold text-foreground tabular">{Math.round(score)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Sub-component: centering bar ─────────────────────────────────────────────

function CenteringBar({
  lrPercent,
  tbPercent,
}: {
  lrPercent: [number, number]
  tbPercent: [number, number]
}) {
  const [lp, rp] = lrPercent
  const [tp, bp] = tbPercent

  return (
    <div className="space-y-2">
      {/* LR */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Left {lp.toFixed(1)}%</span>
          <span>Right {rp.toFixed(1)}%</span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
          <div
            className="h-full rounded-l-full bg-indigo-500/70 transition-all duration-500"
            style={{ width: `${lp}%` }}
          />
          <div
            className="h-full rounded-r-full bg-violet-500/70 transition-all duration-500"
            style={{ width: `${rp}%` }}
          />
        </div>
      </div>
      {/* TB */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Top {tp.toFixed(1)}%</span>
          <span>Bottom {bp.toFixed(1)}%</span>
        </div>
        <div className="h-3 rounded-full bg-secondary overflow-hidden flex">
          <div
            className="h-full rounded-l-full bg-cyan-500/70 transition-all duration-500"
            style={{ width: `${tp}%` }}
          />
          <div
            className="h-full rounded-r-full bg-teal-500/70 transition-all duration-500"
            style={{ width: `${bp}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function GradeResults({ result }: GradeResultsProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { centering, surface, edges, corners: cornerResult, grades, warpedDataUrl } = result

  // Derive sub-scores from the first grade result (they're shared)
  const sub = grades.psa.subScores

  return (
    <div className="space-y-5">
      {/* ── 2×2 grade grid ── */}
      <div className="grid grid-cols-2 gap-3">
        {COMPANIES.map((c, i) => (
          <CompanyGradeCard
            key={c.key}
            name={c.name}
            bg={c.bg}
            text={c.text}
            gradeResult={grades[c.key]}
            delay={i * 0.07}
          />
        ))}
      </div>

      {/* ── Warped card preview ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex justify-center"
      >
        <img
          src={warpedDataUrl}
          alt="Warped card preview"
          className="rounded-xl border border-border object-contain shadow-lg"
          style={{ width: 150, height: 210 }}
        />
      </motion.div>

      {/* ── Analysis Details expandable ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-2xl border border-border bg-card overflow-hidden"
      >
        {/* Toggle header */}
        <button
          type="button"
          onClick={() => setDetailsOpen(prev => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors"
        >
          <span className="text-sm font-semibold text-foreground">Analysis Details</span>
          {detailsOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {detailsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4 space-y-5 border-t border-border"
          >
            {/* Sub-score bars */}
            <div className="pt-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Sub-Scores
              </p>
              <ScoreBar label="Centering" value={sub.centering} color="bg-indigo-500" />
              <ScoreBar label="Surface"   value={sub.surface}   color="bg-emerald-500" />
              <ScoreBar label="Edges"     value={sub.edges}     color="bg-violet-500" />
              <ScoreBar label="Corners"   value={sub.corners}   color="bg-cyan-500" />
            </div>

            {/* Centering */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Centering
              </p>
              <CenteringBar
                lrPercent={centering.lrPercent}
                tbPercent={centering.tbPercent}
              />
              <p className="text-xs text-muted-foreground mt-2 tabular">
                LR ratio: {centering.lrRatio.toFixed(2)} &nbsp;|&nbsp; TB ratio: {centering.tbRatio.toFixed(2)}
              </p>
            </div>

            {/* Surface */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Surface
              </p>
              <ScoreBar label="Score"    value={surface.score}       color="bg-emerald-500" />
              <ScoreBar label="Scratch"  value={surface.scratchScore} color="bg-amber-500" />
              <p className="text-xs text-muted-foreground mt-1 tabular">
                Defect density: {(surface.defectDensity * 100).toFixed(1)}%
              </p>
            </div>

            {/* Edges */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Edges &nbsp;
                <span className="normal-case font-normal text-muted-foreground/70">
                  avg {Math.round(edges.avgScore)} &middot; {edges.chipCount} chip{edges.chipCount !== 1 ? 's' : ''}
                </span>
              </p>
              <EdgeScores scores={edges.scores} />
            </div>

            {/* Corners */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Corners &nbsp;
                <span className="normal-case font-normal text-muted-foreground/70">
                  avg {Math.round(cornerResult.avgScore)}
                </span>
              </p>
              <CornerScores scores={cornerResult.scores} />
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
