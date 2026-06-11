// ── Primitives ────────────────────────────────────────────────────────────────

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

// ── Card / Scan ────────────────────────────────────────────────────────────────

export type CardSide = 'front' | 'back'

export interface CardImage {
  id: string
  side: CardSide
  dataUrl: string
  width: number
  height: number
  fileSize: number
  fileName: string
  uploadedAt: number
}

export interface CardScan {
  id: string
  name: string
  front?: CardImage
  back?: CardImage
  setName?: string
  cardName?: string
  year?: string
  sport?: string
  createdAt: number
  updatedAt: number
}

// ── Computer Vision ───────────────────────────────────────────────────────────

export interface CardBounds {
  /** Bounding box in original image pixels */
  rect: Rect
  /** Clockwise corners: TL, TR, BR, BL */
  corners: [Point, Point, Point, Point]
  /** Rotation angle in degrees */
  angle: number
  /** Confidence 0–1 */
  confidence: number
}

export interface BorderMeasurement {
  /** Distance from outer edge to inner design boundary, in pixels */
  left: number
  right: number
  top: number
  bottom: number
  /** Width of the corrected card image used for measurement */
  cardWidth: number
  cardHeight: number
}

export type ScanQualityIssue =
  | 'low_resolution'
  | 'blurry'
  | 'glare'
  | 'dark'
  | 'overexposed'
  | 'skewed'
  | 'bad_crop'
  | 'card_not_found'

export interface ScanQuality {
  pass: boolean
  score: number  // 0–100
  issues: ScanQualityIssue[]
  resolution: Size
  blurScore: number      // lower = blurrier
  brightnessScore: number // 0–1
  glareScore: number     // 0–1
}

// ── Centering ────────────────────────────────────────────────────────────────

export interface CenteringMeasurement {
  /** Raw pixel measurements */
  borders: BorderMeasurement
  /** Ratios as "55/45" strings */
  leftRight: string
  topBottom: string
  /** Percent deviation from perfect 50/50 (0 = perfect, 50 = max possible) */
  lrDeviation: number
  tbDeviation: number
  /** Sub-score 0–10 */
  score: number
  /** Human-readable assessment */
  assessment: 'Perfect' | 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Miscut'
}

// ── Surface Analysis ──────────────────────────────────────────────────────────

export type DefectType =
  | 'scratch'
  | 'print_defect'
  | 'whitening'
  | 'stain'
  | 'crease'
  | 'ink_loss'
  | 'surface_wear'

export type DefectSeverity = 'minor' | 'moderate' | 'major'

export interface SurfaceDefect {
  id: string
  type: DefectType
  severity: DefectSeverity
  /** Normalized 0–1 coordinates relative to card bounds */
  bounds: { x: number; y: number; w: number; h: number }
  confidence: number
  description: string
}

export interface SurfaceAnalysis {
  defects: SurfaceDefect[]
  /** Sub-scores 0–10 */
  whiteningScore: number
  scratchScore: number
  printQualityScore: number
  overallScore: number
  /** Heatmap pixel data (normalized intensity per region) */
  heatmap?: number[][]
}

// ── Edge / Corner Analysis ────────────────────────────────────────────────────

export type EdgeSide = 'top' | 'bottom' | 'left' | 'right'
export type CornerPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

export interface EdgeCondition {
  side: EdgeSide
  /** 0–1 proportion of edge with whitening */
  whiteningRatio: number
  /** 0–1 roughness index */
  roughness: number
  /** Detected chip/ding count */
  chipCount: number
  /** Sub-score 0–10 */
  score: number
}

export interface CornerCondition {
  position: CornerPosition
  /** 0–1, 1 = perfectly sharp */
  sharpness: number
  /** 0–1 whitening coverage */
  whitening: number
  /** True if significant dent/ding detected */
  dinged: boolean
  /** Sub-score 0–10 */
  score: number
}

export interface EdgeAnalysis {
  edges: Record<EdgeSide, EdgeCondition>
  corners: Record<CornerPosition, CornerCondition>
  edgeScore: number    // 0–10
  cornerScore: number  // 0–10
}

// ── Grading ───────────────────────────────────────────────────────────────────

export type GradingCompany = 'PSA' | 'BGS' | 'CGC' | 'SGC'

export interface SubGrades {
  centering: number   // 0–10
  surface: number     // 0–10
  edges: number       // 0–10
  corners: number     // 0–10
}

export interface GradeResult {
  company: GradingCompany
  /** Numeric grade (e.g. 9.5, 10) */
  grade: number
  /** Label (e.g. "Gem Mint", "Pristine") */
  label: string
  subGrades: SubGrades
  /** 0–1 confidence of estimate */
  confidence: number
  /** Notable issues affecting the grade */
  flags: string[]
}

export interface GradingReport {
  id: string
  scanId: string
  createdAt: number
  centering: CenteringMeasurement
  surface: SurfaceAnalysis
  edges: EdgeAnalysis
  cardBounds?: CardBounds
  grades: GradeResult[]
}

// ── UI State ──────────────────────────────────────────────────────────────────

export type AnalysisTool =
  | 'centering'
  | 'surface'
  | 'edges'
  | 'corners'
  | 'comparison'
  | 'ruler'

export type OverlayType =
  | 'centering'
  | 'defects'
  | 'edges'
  | 'corners'
  | 'heatmap'
  | 'rulers'
  | 'measurements'

export interface ViewState {
  zoom: number
  panX: number
  panY: number
  activeTool: AnalysisTool
  activeOverlays: Set<OverlayType>
  showFront: boolean
}

// ── Collection ────────────────────────────────────────────────────────────────

export interface CollectionEntry {
  id: string
  scanId: string
  cardName: string
  setName: string
  year: string
  sport: string
  estimatedGrade: number
  gradingCompany: GradingCompany
  notes: string
  addedAt: number
  thumbnailDataUrl?: string
}
