'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { gradeTailwindColor } from '../engine'
import type { GradeResult } from '@/shared/types'

interface GradeDisplayProps {
  grades: GradeResult[]
  className?: string
  compact?: boolean
}

const COMPANY_LOGOS: Record<string, string> = {
  PSA: 'PSA',
  BGS: 'BGS',
  CGC: 'CGC',
  SGC: 'SGC',
}

const COMPANY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PSA: { bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20' },
  BGS: { bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20' },
  CGC: { bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/20' },
  SGC: { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/20' },
}

export default function GradeDisplay({ grades, className, compact = false }: GradeDisplayProps) {
  if (grades.length === 0) return null

  return (
    <div className={cn('space-y-3', className)}>
      {grades.map((grade, i) => (
        <GradeCard key={grade.company} grade={grade} index={i} compact={compact} />
      ))}
    </div>
  )
}

function GradeCard({ grade, index, compact }: { grade: GradeResult; index: number; compact: boolean }) {
  const colors = COMPANY_COLORS[grade.company]
  const gradeColor = gradeTailwindColor(grade.grade)
  const confidence = Math.round(grade.confidence * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25 }}
      className={cn(
        'rounded-xl border p-4',
        colors.border,
        'bg-card surface-highlight',
        'relative overflow-hidden'
      )}
    >
      {/* Background glow */}
      <div
        className={cn('absolute inset-0 opacity-30 pointer-events-none', colors.bg)}
        style={{
          background: `radial-gradient(ellipse at top right, ${
            grade.grade >= 9.5 ? 'rgba(0,210,255,0.08)' :
            grade.grade >= 8 ? 'rgba(16,185,129,0.08)' :
            grade.grade >= 6 ? 'rgba(132,204,22,0.06)' :
            'rgba(245,158,11,0.06)'
          }, transparent 70%)`,
        }}
      />

      <div className="relative flex items-start gap-3">
        {/* Company badge */}
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
          'text-xs font-bold tracking-tight border',
          colors.bg, colors.text, colors.border
        )}>
          {COMPANY_LOGOS[grade.company]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className={cn('text-2xl font-black tabular tracking-tight', gradeColor)}>
                {grade.grade}
              </span>
              <span className="text-xs text-muted-foreground ml-2 font-medium">
                {grade.label}
              </span>
            </div>
            {/* Confidence */}
            <div className="text-right flex-shrink-0">
              <div className="text-xs text-muted-foreground">confidence</div>
              <div className="text-sm font-medium text-foreground">{confidence}%</div>
            </div>
          </div>

          {!compact && (
            <>
              {/* Sub-grade bars */}
              <div className="mt-3 space-y-1.5">
                <SubGradeBar label="Centering" value={grade.subGrades.centering} />
                <SubGradeBar label="Surface"   value={grade.subGrades.surface} />
                <SubGradeBar label="Edges"     value={grade.subGrades.edges} />
                <SubGradeBar label="Corners"   value={grade.subGrades.corners} />
              </div>

              {/* Flags */}
              {grade.flags.length > 0 && (
                <div className="mt-2.5 space-y-1">
                  {grade.flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                      <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{flag}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function SubGradeBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100
  const color =
    value >= 9.5 ? '#00D2FF' :
    value >= 8   ? '#10B981' :
    value >= 6   ? '#84CC16' :
    value >= 4   ? '#F59E0B' : '#EF4444'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-xs tabular font-medium w-6 text-right" style={{ color }}>
        {value.toFixed(1)}
      </span>
    </div>
  )
}
