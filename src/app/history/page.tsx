'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { History, ScanLine, Trash2, ExternalLink, Star, Clock } from 'lucide-react'
import { cn, formatDate } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import Sidebar from '@/shared/components/layout/Sidebar'
import { db } from '@/storage/db'
import { gradeTailwindColor } from '@/features/grading-engine/engine'
import type { GradingReport } from '@/shared/types'

export default function HistoryPage() {
  const [reports, setReports] = useState<GradingReport[]>([])

  useEffect(() => {
    db.reports.orderBy('createdAt').reverse().toArray().then(setReports)
  }, [])

  const handleDelete = async (id: string) => {
    await db.reports.delete(id)
    setReports((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold">Grading History</h1>
            <Badge variant="secondary" className="text-xs">{reports.length}</Badge>
          </div>
          <Link href="/analyze">
            <Button size="sm" className="gap-1.5">
              <ScanLine className="w-3.5 h-3.5" />
              New Analysis
            </Button>
          </Link>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-4xl mx-auto space-y-3">
            {reports.length === 0 ? (
              <div className="text-center py-24 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
                  <History className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">No history yet</h2>
                  <p className="text-sm text-muted-foreground">
                    Completed analyses will appear here.
                  </p>
                </div>
                <Link href="/analyze">
                  <Button className="gap-1.5">
                    <ScanLine className="w-4 h-4" />
                    Start Analyzing
                  </Button>
                </Link>
              </div>
            ) : (
              reports.map((report, i) => (
                <ReportRow key={report.id} report={report} index={i} onDelete={handleDelete} />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function ReportRow({
  report, index, onDelete
}: { report: GradingReport; index: number; onDelete: (id: string) => void }) {
  const psaGrade = report.grades.find((g) => g.company === 'PSA')
  const bestGrade = psaGrade ?? report.grades[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/20 transition-colors surface-highlight"
    >
      {/* Grade badge */}
      {bestGrade && (
        <div className="text-center flex-shrink-0 w-14">
          <div className="text-xs text-muted-foreground">{bestGrade.company}</div>
          <div className={cn('text-2xl font-black tabular', gradeTailwindColor(bestGrade.grade))}>
            {bestGrade.grade}
          </div>
          <div className="text-xs text-muted-foreground truncate">{bestGrade.label}</div>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">Analysis #{report.id.slice(-6)}</span>
          <div className="flex gap-1">
            {report.grades.map((g) => (
              <span key={g.company} className="text-xs text-muted-foreground">
                {g.company}: <span className={gradeTailwindColor(g.grade)}>{g.grade}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(report.createdAt)}
          </span>
          {report.centering && (
            <span>
              Centering: {report.centering.leftRight} · {report.centering.topBottom}
            </span>
          )}
          {report.surface && (
            <span>Surface: {report.surface.overallScore.toFixed(1)}/10</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link href={`/analyze?report=${report.id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
            <ExternalLink className="w-3 h-3" />
            Open
          </Button>
        </Link>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(report.id)}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </motion.div>
  )
}
