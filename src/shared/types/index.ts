export interface Point {
  x: number
  y: number
}

// Kept for compatibility with shared/lib/math.ts
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

export type CardCorners = [Point, Point, Point, Point] // TL, TR, BR, BL

export interface CenteringResult {
  leftBorder: number
  rightBorder: number
  topBorder: number
  bottomBorder: number
  lrRatio: number       // max/min, always >= 1
  tbRatio: number       // max/min, always >= 1
  lrPercent: [number, number]  // [left%, right%]
  tbPercent: [number, number]  // [top%, bottom%]
}

export interface SurfaceResult {
  score: number         // 0-100 (100 = perfect)
  defectDensity: number // 0-1
  scratchScore: number  // 0-100
}

export interface EdgeResult {
  scores: [number, number, number, number] // L R T B, 0-100
  avgScore: number
  chipCount: number
}

export interface CornerResult {
  scores: [number, number, number, number] // TL TR BR BL, 0-100
  avgScore: number
}

export interface GradeSubScores {
  centering: number
  surface: number
  edges: number
  corners: number
}

export interface GradeResult {
  numeric: number
  label: string
  subScores: GradeSubScores
}

export interface GradeEstimates {
  psa: GradeResult
  bgs: GradeResult
  cgc: GradeResult
  sgc: GradeResult
  tag: GradeResult
}

export interface AnalysisResult {
  centering: CenteringResult
  surface: SurfaceResult
  edges: EdgeResult
  corners: CornerResult
  grades: GradeEstimates
  warpedDataUrl: string
  angleDeviation: number  // degrees tilt from level
}

export type AnalysisState =
  | { status: 'idle' }
  | { status: 'analyzing' }
  | { status: 'done'; result: AnalysisResult }
  | { status: 'error'; message: string }
