'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine, Crosshair, Activity, Layers, Star,
  ChevronLeft, RotateCcw,
  Download, X, AlertCircle, AlertTriangle, CheckCircle2,
  Loader2
} from 'lucide-react'
import { cn, generateId, fileToDataUrl, getImageDimensions } from '@/shared/lib/utils'
import { ScrollArea } from '@/shared/components/ui/scroll-area'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs'
import { Progress } from '@/shared/components/ui/progress'
import { Separator } from '@/shared/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/shared/components/ui/tooltip'
import AppHeader from '@/shared/components/layout/AppHeader'
import { estimateAllGrades } from '@/features/grading-engine/engine'
import UploadZone from '@/features/upload/components/UploadZone'
import CenteringTool from '@/features/centering/components/CenteringTool'
import SurfaceAnalyzer from '@/features/surface-analysis/components/SurfaceAnalyzer'
import EdgeAnalyzer from '@/features/edge-analysis/components/EdgeAnalyzer'
import GradeDisplay from '@/features/grading-engine/components/GradeDisplay'
import { useAnalysisStore, selectIsProcessing, selectBestGrade } from '@/features/analysis/store'
import { useAnalysisPipeline } from '@/features/analysis/hooks/useAnalysisPipeline'
import { generatePDFReport } from '@/features/export/generateReport'
import type { CardImage, ScanQuality, CenteringMeasurement } from '@/shared/types'

const PHASE_LABELS: Record<string, string> = {
  idle: '',
  uploading: 'Loading image…',
  loading_cv: 'Loading CV engine… (first run ~15s)',
  detecting: 'Detecting card…',
  centering: 'Analyzing centering…',
  surface: 'Scanning surface…',
  edges: 'Checking edges & corners…',
  grading: 'Calculating grades…',
  complete: 'Analysis complete',
  error: 'Analysis failed',
}

export default function AnalyzePage() {
  const store = useAnalysisStore()
  const { runAnalysis, reset } = useAnalysisPipeline()
  const isProcessing = useAnalysisStore(selectIsProcessing)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

  const activeDataUrl =
    (store.correctedDataUrl ?? (store.showFront ? store.frontImage?.dataUrl : store.backImage?.dataUrl)) ?? null

  const handleUpload = useCallback(async (dataUrl: string, file: File, side: 'front' | 'back') => {
    const dims = await getImageDimensions(dataUrl)
    const img: CardImage = {
      id: generateId(),
      side,
      dataUrl,
      width: dims.width,
      height: dims.height,
      fileSize: file.size,
      fileName: file.name,
      uploadedAt: Date.now(),
    }
    if (side === 'front') {
      store.setFrontImage(img)
      store.setShowFront(true)
      store.setPhase('uploading', 2)
      await runAnalysis(dataUrl)
    } else {
      store.setBackImage(img)
    }
  }, [store, runAnalysis])

  // Paste handler
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (!file) continue
          const dataUrl = await fileToDataUrl(file)
          await handleUpload(dataUrl, file, 'front')
          break
        }
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [handleUpload])

  const activeImage = store.showFront ? store.frontImage : store.backImage
  const imgW = activeImage?.width ?? 600
  const imgH = activeImage?.height ?? 880

  const hasFront = !!store.frontImage
  const hasBack = !!store.backImage
  const hasResults = store.phase === 'complete'

  const handleExport = useCallback(() => {
    generatePDFReport({
      grades: store.grades,
      centering: store.centering,
      surface: store.surface,
      edges: store.edges,
      quality: store.quality,
      hasBack,
    })
  }, [store.grades, store.centering, store.surface, store.edges, store.quality, hasBack])

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-background">
        {/* Top header */}
        <AppHeader />

        {/* Main workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 h-12 border-b border-border bg-card/50 flex-shrink-0">
            {/* Tool selector */}
            <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
              {([
                { tool: 'centering', icon: Crosshair, label: 'Centering' },
                { tool: 'surface',   icon: Activity,  label: 'Surface'   },
                { tool: 'edges',     icon: Layers,    label: 'Edges'     },
              ] as const).map(({ tool, icon: Icon, label }) => (
                <Tooltip key={tool}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => store.setActiveTool(tool)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                        store.activeTool === tool
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Front/Back toggle */}
            {(hasFront || hasBack) && (
              <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 ml-2">
                <button
                  onClick={() => store.setShowFront(true)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    store.showFront
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    !hasFront && 'opacity-40 cursor-not-allowed'
                  )}
                  disabled={!hasFront}
                >Front</button>
                <button
                  onClick={() => store.setShowFront(false)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                    !store.showFront
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                    !hasBack && 'opacity-40 cursor-not-allowed'
                  )}
                  disabled={!hasBack}
                >Back</button>
              </div>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="flex items-center gap-2 ml-3">
                <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">{PHASE_LABELS[store.phase]}</span>
                <div className="w-24"><Progress value={store.progress} /></div>
              </div>
            )}

            {hasResults && !isProcessing && (
              <div className="flex items-center gap-1.5 ml-3 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Analysis complete
              </div>
            )}

            {store.error && (
              <div className="flex items-center gap-1.5 ml-3 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5" />
                {store.error}
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              {hasFront && (
                <Button size="sm" variant="outline" onClick={reset} className="h-7 text-xs gap-1.5">
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
              )}
              {hasResults && (
                <Button size="sm" onClick={handleExport} className="h-7 text-xs gap-1.5">
                  <Download className="w-3 h-3" />
                  Export PDF
                </Button>
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 flex overflow-hidden">
            {/* Center workspace */}
            <div className="flex-1 overflow-hidden">
              {!hasFront ? (
                <EmptyState onUpload={(dataUrl, file) => handleUpload(dataUrl, file, 'front')} />
              ) : (
                <ScrollArea className="h-full">
                  <div className="p-4 min-h-full">
                    <AnimatePresence mode="wait">
                      {store.activeTool === 'centering' && (
                        <motion.div
                          key="centering"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {activeDataUrl ? (
                            <CenteringTool
                              imageDataUrl={activeDataUrl}
                              imageWidth={imgW}
                              imageHeight={imgH}
                              initialCentering={store.centering}
                              onCenteringChange={(c) => {
                                store.setCentering(c)
                                if (store.surface && store.edges) {
                                  store.setGrades(estimateAllGrades(c, store.surface, store.edges))
                                }
                              }}
                            />
                          ) : (
                            <LoadingPlaceholder label="Loading centering tool…" />
                          )}
                          {store.centering && <CenteringStats centering={store.centering} />}
                        </motion.div>
                      )}

                      {store.activeTool === 'surface' && (
                        <motion.div
                          key="surface"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {store.surface && activeDataUrl ? (
                            <SurfaceAnalyzer
                              imageDataUrl={activeDataUrl}
                              imageWidth={imgW}
                              imageHeight={imgH}
                              analysis={store.surface}
                            />
                          ) : isProcessing ? (
                            <LoadingPlaceholder label={PHASE_LABELS[store.phase]} />
                          ) : (
                            <RunAnalysisPrompt onRun={() => activeDataUrl && runAnalysis(activeDataUrl)} />
                          )}
                        </motion.div>
                      )}

                      {store.activeTool === 'edges' && (
                        <motion.div
                          key="edges"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {store.edges && activeDataUrl ? (
                            <EdgeAnalyzer
                              imageDataUrl={activeDataUrl}
                              imageWidth={imgW}
                              imageHeight={imgH}
                              analysis={store.edges}
                            />
                          ) : isProcessing ? (
                            <LoadingPlaceholder label={PHASE_LABELS[store.phase]} />
                          ) : (
                            <RunAnalysisPrompt onRun={() => activeDataUrl && runAnalysis(activeDataUrl)} />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Right panel — Grade results */}
            <AnimatePresence>
              {!rightPanelCollapsed && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="flex-shrink-0 border-l border-border bg-card overflow-hidden"
                >
                  <div className="w-[300px] h-full flex flex-col">
                    <div className="flex items-center gap-2 px-4 h-12 border-b border-border flex-shrink-0">
                      <Star className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Grade Estimates</span>
                      {hasResults && !hasBack && (
                        <Badge variant="outline" className="ml-1 text-[10px] border-amber-500/40 text-amber-400 px-1.5 py-0 h-4">
                          Estimated
                        </Badge>
                      )}
                      <button
                        onClick={() => setRightPanelCollapsed(true)}
                        className="ml-auto p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="p-4 space-y-4">
                        {/* Estimated grade notice */}
                        {hasResults && !hasBack && (
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <span>Estimated — front side only. Upload back for a complete grade.</span>
                          </div>
                        )}

                        {/* Scan quality */}
                        {store.quality && <QualityBadge quality={store.quality} />}

                        {/* Grade cards */}
                        {store.grades.length > 0 ? (
                          <GradeDisplay grades={store.grades} />
                        ) : isProcessing ? (
                          <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                              <div key={i} className="h-24 rounded-xl bg-secondary shimmer" />
                            ))}
                          </div>
                        ) : hasFront ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            <ScanLine className="w-8 h-8 mx-auto mb-3 opacity-30" />
                            Run analysis to see grade estimates
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            Upload a card to get started
                          </div>
                        )}

                        {/* Upload back side */}
                        {hasFront && !hasBack && (
                          <>
                            <Separator />
                            <div>
                              <div className="text-xs text-muted-foreground mb-2">
                                Add back side <span className="text-muted-foreground/50">(optional — improves accuracy)</span>
                              </div>
                              <UploadZone
                                side="back"
                                currentDataUrl={store.backImage?.dataUrl}
                                onUpload={(dataUrl, file) => handleUpload(dataUrl, file, 'back')}
                              />
                            </div>
                          </>
                        )}

                        {/* Export button in panel */}
                        {hasResults && (
                          <>
                            <Separator />
                            <Button
                              onClick={handleExport}
                              variant="outline"
                              className="w-full gap-2 text-xs h-8"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download Grading Report
                            </Button>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Right panel toggle (when collapsed) */}
            {rightPanelCollapsed && (
              <button
                onClick={() => setRightPanelCollapsed(false)}
                className="flex-shrink-0 w-8 border-l border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Show grade panel"
              >
                <div className="flex flex-col items-center gap-1">
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="text-xs [writing-mode:vertical-lr] rotate-180">Grades</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState({ onUpload }: { onUpload: (dataUrl: string, file: File) => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="max-w-md w-full px-6 space-y-6 text-center">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <ScanLine className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Upload a card to analyze</h2>
          <p className="text-sm text-muted-foreground">
            Drop, click, or paste a card image. Analysis runs locally — nothing leaves your device.
          </p>
        </div>
        <UploadZone side="front" onUpload={onUpload} className="text-left" />
        <div className="text-xs text-muted-foreground">
          For best results: flat lighting, 300 DPI+, no glare
        </div>
      </div>
    </div>
  )
}

function LoadingPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

function RunAnalysisPrompt({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-muted-foreground text-sm text-center">
        <ScanLine className="w-8 h-8 mx-auto mb-3 opacity-30" />
        Analysis not run yet
      </div>
      <Button onClick={onRun} size="sm" variant="outline" className="gap-1.5">
        <ScanLine className="w-3.5 h-3.5" />
        Run Analysis
      </Button>
    </div>
  )
}

function CenteringStats({ centering }: { centering: CenteringMeasurement }) {
  const devColor = (dev: number) =>
    dev <= 5 ? 'text-emerald-400' : dev <= 10 ? 'text-lime-400' : dev <= 15 ? 'text-amber-400' : 'text-red-400'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 bg-card border border-border rounded-xl p-4 grid grid-cols-3 gap-4"
    >
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-1">Left / Right</div>
        <div className="text-lg font-black tabular text-indigo-300">{centering.leftRight}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-1">Top / Bottom</div>
        <div className="text-lg font-black tabular text-violet-300">{centering.topBottom}</div>
      </div>
      <div className="text-center">
        <div className="text-xs text-muted-foreground mb-1">Assessment</div>
        <div className={cn('text-sm font-bold', devColor(Math.max(centering.lrDeviation, centering.tbDeviation)))}>
          {centering.assessment}
        </div>
      </div>
    </motion.div>
  )
}

function QualityBadge({ quality }: { quality: ScanQuality }) {
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs',
      quality.pass
        ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
        : 'border-amber-500/20 bg-amber-500/5 text-amber-400'
    )}>
      {quality.pass
        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      }
      <span>
        Scan quality: {quality.score}/100
        {quality.issues.length > 0 && ` · ${quality.issues.join(', ')}`}
      </span>
    </div>
  )
}
