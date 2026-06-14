'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, RotateCcw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAnalyzer } from '@/features/analyzer/hooks/useAnalyzer'
import { ImageDropzone } from '@/features/analyzer/components/ImageDropzone'
import { BorderAdjuster } from '@/features/analyzer/components/BorderAdjuster'
import { LevelIndicator } from '@/features/analyzer/components/LevelIndicator'
import { GradeResults } from '@/features/analyzer/components/GradeResults'
import type { AnalysisState } from '@/shared/types'

const ANALYSIS_STEPS = [
  'Computing perspective warp...',
  'Measuring centering...',
  'Analyzing surface...',
  'Estimating grades...',
]

function AnalysisSteps() {
  return (
    <div className="space-y-2 mt-4">
      {ANALYSIS_STEPS.map((step, i) => (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.6, duration: 0.3 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.6 + 0.1 }}
            className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0"
          />
          {step}
        </motion.div>
      ))}
    </div>
  )
}

function RightPanelContent({
  analysisState,
  hasImage,
  hasCorners,
  onAnalyze,
  onReset,
}: {
  analysisState: AnalysisState
  hasImage: boolean
  hasCorners: boolean
  onAnalyze: () => void
  onReset: () => void
}) {
  if (analysisState.status === 'analyzing') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <h3 className="text-base font-semibold mb-1">Analyzing card...</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Running computer vision pipeline
        </p>
        <AnalysisSteps />
      </div>
    )
  }

  if (analysisState.status === 'done') {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="p-4 flex-1">
          <GradeResults result={analysisState.result} />
        </div>
        <div className="p-4 border-t border-border flex-shrink-0">
          <button
            onClick={onReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Analyze Another
          </button>
        </div>
      </div>
    )
  }

  // idle or error
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold mb-1">Ready to Analyze</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Align the corner guides to your card&apos;s edges, then click Analyze
      </p>

      {analysisState.status === 'error' && (
        <div className="w-full mb-4 px-3 py-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-sm text-destructive text-left">
          {analysisState.message}
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={!hasImage || !hasCorners}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Sparkles className="w-4 h-4" />
        Analyze
      </button>
    </div>
  )
}

export default function AnalyzePage() {
  const {
    imageFile,
    imageUrl,
    imageDimensions,
    outerCorners,
    innerCorners,
    analysisState,
    setImage,
    setOuterCorners,
    setInnerCorners,
    analyze,
    reset,
  } = useAnalyzer()

  const hasImage = !!imageFile && !!imageUrl
  const hasCorners = !!outerCorners && !!innerCorners

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Fixed header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 backdrop-blur-md bg-background/80 border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <span className="font-semibold text-foreground flex-1 text-center">
          CardGrade Studio
        </span>
        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
          {process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.1'}
        </span>
      </header>

      {/* Main content — offset for fixed header */}
      <div className="flex-1 pt-14 flex flex-col lg:flex-row">
        {/* Left panel — image area */}
        <div className="flex-1 flex flex-col p-4 gap-4">
          <AnimatePresence mode="wait">
            {!hasImage ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex items-center justify-center"
              >
                <div className="w-full max-w-lg">
                  <ImageDropzone onImageSelected={setImage} />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="adjuster"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-3"
              >
                <BorderAdjuster
                  imageUrl={imageUrl!}
                  imageDimensions={imageDimensions!}
                  outerCorners={outerCorners!}
                  innerCorners={innerCorners!}
                  onOuterChange={setOuterCorners}
                  onInnerChange={setInnerCorners}
                />

                <LevelIndicator corners={outerCorners} />

                <p className="text-xs text-muted-foreground text-center">
                  Drag the corner handles to match your card&apos;s exact edges
                </p>

                <div className="flex justify-center">
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>

                {/* Mobile-only Analyze button below image */}
                <div className="lg:hidden mt-2">
                  {analysisState.status === 'analyzing' ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-secondary text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing card...
                    </div>
                  ) : analysisState.status === 'done' ? (
                    <button
                      onClick={reset}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-border bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Analyze Another
                    </button>
                  ) : (
                    <button
                      onClick={analyze}
                      disabled={!hasImage || !hasCorners}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-4 h-4" />
                      Analyze
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right panel — results / analyze prompt (desktop) */}
        <aside className="hidden lg:flex w-80 xl:w-96 flex-col border-l border-border bg-card sticky top-14 h-[calc(100vh-3.5rem)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={analysisState.status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex-1 h-full"
            >
              <RightPanelContent
                analysisState={analysisState}
                hasImage={hasImage}
                hasCorners={hasCorners}
                onAnalyze={analyze}
                onReset={reset}
              />
            </motion.div>
          </AnimatePresence>
        </aside>

        {/* Mobile results panel — shown below image when done */}
        <AnimatePresence>
          {analysisState.status === 'done' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border bg-card overflow-hidden"
            >
              <div className="p-4">
                <GradeResults result={analysisState.result} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
