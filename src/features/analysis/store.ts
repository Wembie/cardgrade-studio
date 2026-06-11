import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  CardImage,
  CenteringMeasurement,
  SurfaceAnalysis,
  EdgeAnalysis,
  GradeResult,
  CardBounds,
  ScanQuality,
  AnalysisTool,
  OverlayType,
} from '@/shared/types'

export type AnalysisPhase =
  | 'idle'
  | 'uploading'
  | 'loading_cv'
  | 'detecting'
  | 'centering'
  | 'surface'
  | 'edges'
  | 'grading'
  | 'complete'
  | 'error'

interface AnalysisState {
  frontImage: CardImage | null
  backImage: CardImage | null
  correctedDataUrl: string | null

  // CV results
  cardBounds: CardBounds | null
  quality: ScanQuality | null
  centering: CenteringMeasurement | null
  surface: SurfaceAnalysis | null
  edges: EdgeAnalysis | null
  grades: GradeResult[]

  // Manual centering override
  manualCentering: { left: number; right: number; top: number; bottom: number } | null

  // Analysis state
  phase: AnalysisPhase
  progress: number  // 0-100
  error: string | null

  // View state
  activeTool: AnalysisTool
  activeOverlays: OverlayType[]
  zoom: number
  showFront: boolean
  panX: number
  panY: number

  // Actions
  setFrontImage: (img: CardImage | null) => void
  setBackImage: (img: CardImage | null) => void
  setCorrectedDataUrl: (url: string | null) => void
  setCardBounds: (bounds: CardBounds | null) => void
  setQuality: (q: ScanQuality | null) => void
  setCentering: (c: CenteringMeasurement | null) => void
  setSurface: (s: SurfaceAnalysis | null) => void
  setEdges: (e: EdgeAnalysis | null) => void
  setGrades: (g: GradeResult[]) => void
  setManualCentering: (m: { left: number; right: number; top: number; bottom: number } | null) => void
  setPhase: (phase: AnalysisPhase, progress?: number) => void
  setError: (err: string | null) => void
  setActiveTool: (tool: AnalysisTool) => void
  toggleOverlay: (overlay: OverlayType) => void
  setOverlays: (overlays: OverlayType[]) => void
  setZoom: (zoom: number) => void
  setShowFront: (v: boolean) => void
  setPan: (x: number, y: number) => void
  reset: () => void
}

const defaultOverlays: OverlayType[] = ['centering', 'measurements']

export const useAnalysisStore = create<AnalysisState>()(
  immer((set) => ({
    frontImage: null,
    backImage: null,
    correctedDataUrl: null,
    cardBounds: null,
    quality: null,
    centering: null,
    surface: null,
    edges: null,
    grades: [],
    manualCentering: null,
    phase: 'idle',
    progress: 0,
    error: null,
    activeTool: 'centering',
    activeOverlays: defaultOverlays,
    zoom: 1,
    showFront: true,
    panX: 0,
    panY: 0,

    setFrontImage: (img) => set((s) => { s.frontImage = img }),
    setBackImage: (img) => set((s) => { s.backImage = img }),
    setCorrectedDataUrl: (url) => set((s) => { s.correctedDataUrl = url }),
    setCardBounds: (bounds) => set((s) => { s.cardBounds = bounds }),
    setQuality: (q) => set((s) => { s.quality = q }),
    setCentering: (c) => set((s) => { s.centering = c }),
    setSurface: (sv) => set((s) => { s.surface = sv }),
    setEdges: (e) => set((s) => { s.edges = e }),
    setGrades: (g) => set((s) => { s.grades = g }),
    setManualCentering: (m) => set((s) => { s.manualCentering = m }),
    setPhase: (phase, progress) => set((s) => {
      s.phase = phase
      if (progress !== undefined) s.progress = progress
    }),
    setError: (err) => set((s) => { s.error = err; if (err) s.phase = 'error' }),
    setActiveTool: (tool) => set((s) => { s.activeTool = tool }),
    toggleOverlay: (overlay) => set((s) => {
      const idx = s.activeOverlays.indexOf(overlay)
      if (idx === -1) s.activeOverlays.push(overlay)
      else s.activeOverlays.splice(idx, 1)
    }),
    setOverlays: (overlays) => set((s) => { s.activeOverlays = overlays }),
    setZoom: (zoom) => set((s) => { s.zoom = zoom }),
    setShowFront: (v) => set((s) => { s.showFront = v }),
    setPan: (x, y) => set((s) => { s.panX = x; s.panY = y }),
    reset: () => set((s) => {
      s.frontImage = null
      s.backImage = null
      s.correctedDataUrl = null
      s.cardBounds = null
      s.quality = null
      s.centering = null
      s.surface = null
      s.edges = null
      s.grades = []
      s.manualCentering = null
      s.phase = 'idle'
      s.progress = 0
      s.error = null
      s.activeOverlays = defaultOverlays
      s.zoom = 1
      s.panX = 0
      s.panY = 0
    }),
  }))
)

// ── Selectors ────────────────────────────────────────────────────────────────

export const selectActiveImage = (s: AnalysisState) =>
  s.showFront ? s.frontImage : s.backImage

export const selectBestGrade = (s: AnalysisState): GradeResult | null =>
  s.grades.find((g) => g.company === 'PSA') ?? s.grades[0] ?? null

export const selectAnalysisComplete = (s: AnalysisState): boolean =>
  s.phase === 'complete'

export const selectIsProcessing = (s: AnalysisState): boolean =>
  ['uploading', 'detecting', 'centering', 'surface', 'edges', 'grading'].includes(s.phase)
