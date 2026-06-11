'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  FolderOpen, Plus, Search, Filter, ScanLine,
  TrendingUp, Star, Calendar, Trash2, ExternalLink
} from 'lucide-react'
import { cn, formatDate } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Separator } from '@/shared/components/ui/separator'
import Sidebar from '@/shared/components/layout/Sidebar'
import { db } from '@/storage/db'
import type { CollectionEntry, GradingCompany } from '@/shared/types'

const COMPANY_COLORS: Record<GradingCompany, string> = {
  PSA: 'text-blue-300',
  BGS: 'text-purple-300',
  CGC: 'text-orange-300',
  SGC: 'text-green-300',
}

export default function CollectionPage() {
  const [entries, setEntries] = useState<CollectionEntry[]>([])
  const [search, setSearch] = useState('')
  const [filterCompany, setFilterCompany] = useState<GradingCompany | 'all'>('all')

  useEffect(() => {
    db.collection.orderBy('addedAt').reverse().toArray().then(setEntries)
  }, [])

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.cardName.toLowerCase().includes(search.toLowerCase()) ||
      e.setName.toLowerCase().includes(search.toLowerCase())
    const matchCompany = filterCompany === 'all' || e.gradingCompany === filterCompany
    return matchSearch && matchCompany
  })

  const avgGrade = entries.length
    ? (entries.reduce((s, e) => s + e.estimatedGrade, 0) / entries.length).toFixed(1)
    : '—'

  const topGrades = entries
    .sort((a, b) => b.estimatedGrade - a.estimatedGrade)
    .slice(0, 3)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold">Collection</h1>
            <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
          </div>
          <Link href="/analyze">
            <Button size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Analyze Card
            </Button>
          </Link>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {entries.length === 0 ? (
              <EmptyCollection />
            ) : (
              <>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    label="Total Cards"
                    value={entries.length.toString()}
                    icon={<FolderOpen className="w-4 h-4" />}
                    color="text-indigo-400"
                  />
                  <StatCard
                    label="Average Grade"
                    value={avgGrade}
                    icon={<Star className="w-4 h-4" />}
                    color="text-amber-400"
                  />
                  <StatCard
                    label="Last Added"
                    value={entries.length ? formatDate(entries[0].addedAt).split(',')[0] : '—'}
                    icon={<Calendar className="w-4 h-4" />}
                    color="text-emerald-400"
                  />
                </div>

                {/* Search + filter */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or set…"
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-input text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {(['all', 'PSA', 'BGS', 'CGC', 'SGC'] as const).map((c) => (
                      <button
                        key={c}
                        onClick={() => setFilterCompany(c)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          filterCompany === c
                            ? 'bg-primary/20 border-primary/40 text-primary'
                            : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
                        )}
                      >
                        {c === 'all' ? 'All' : c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((entry, i) => (
                    <CollectionCard key={entry.id} entry={entry} index={i} />
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No cards match your search
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function CollectionCard({ entry, index }: { entry: CollectionEntry; index: number }) {
  const gradeColor = (g: number) =>
    g >= 9.5 ? 'text-cyan-300' : g >= 8 ? 'text-emerald-300' : g >= 6 ? 'text-lime-300' : g >= 4 ? 'text-amber-300' : 'text-red-300'
  const compColor = COMPANY_COLORS[entry.gradingCompany]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors surface-highlight group"
    >
      {/* Thumbnail */}
      <div className="h-36 bg-secondary/30 flex items-center justify-center border-b border-border relative">
        {entry.thumbnailDataUrl ? (
          <img src={entry.thumbnailDataUrl} alt={entry.cardName} className="h-full w-full object-contain" />
        ) : (
          <ScanLine className="w-10 h-10 text-muted-foreground/30" />
        )}
        <div className={cn('absolute top-2 right-2 text-xs font-bold', compColor)}>
          {entry.gradingCompany}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{entry.cardName}</div>
            <div className="text-xs text-muted-foreground truncate">{entry.setName} · {entry.year}</div>
          </div>
          <div className={cn('text-2xl font-black tabular flex-shrink-0', gradeColor(entry.estimatedGrade))}>
            {entry.estimatedGrade}
          </div>
        </div>

        {entry.sport && (
          <Badge variant="secondary" className="text-xs mb-2">{entry.sport}</Badge>
        )}

        <div className="flex items-center gap-2 mt-3">
          <Link href={`/analyze?scan=${entry.scanId}`} className="flex-1">
            <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5">
              <ExternalLink className="w-3 h-3" />
              View Analysis
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string; value: string
  icon: React.ReactNode; color: string
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 surface-highlight">
      <div className={cn('flex items-center gap-2 mb-2', color)}>
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className={cn('text-3xl font-black tabular', color)}>{value}</div>
    </div>
  )
}

function EmptyCollection() {
  return (
    <div className="text-center py-24 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
        <FolderOpen className="w-8 h-8 text-muted-foreground/40" />
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-1">Collection is empty</h2>
        <p className="text-sm text-muted-foreground">
          Grade cards in the Analyze workspace to add them here.
        </p>
      </div>
      <Link href="/analyze">
        <Button className="gap-1.5">
          <ScanLine className="w-4 h-4" />
          Start Analyzing
        </Button>
      </Link>
    </div>
  )
}
