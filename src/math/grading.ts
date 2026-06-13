import type {
  CenteringResult,
  SurfaceResult,
  EdgeResult,
  CornerResult,
  GradeResult,
  GradeEstimates,
  GradeSubScores,
} from '@/shared/types'

// ── Centering ratio → score (0-100) ──────────────────────────────────────────
//
// Breakpoints derived from published PSA/BGS centering tolerance charts.
// Linear interpolation between breakpoints.

const CENTERING_BREAKPOINTS: [ratio: number, score: number][] = [
  [1.0, 100],
  [1.12, 95],
  [1.22, 88],
  [1.5, 80],
  [1.86, 70],
  [2.33, 58],
  [3.0, 45],
  [4.0, 32],
]
const CENTERING_FLOOR_SCORE = 15

function centeringRatioToScore(lrRatio: number, tbRatio: number): number {
  const worstRatio = Math.max(lrRatio, tbRatio)

  // Beyond last breakpoint
  if (worstRatio >= CENTERING_BREAKPOINTS[CENTERING_BREAKPOINTS.length - 1][0]) {
    return CENTERING_FLOOR_SCORE
  }

  // Find the surrounding breakpoints and interpolate
  for (let i = 0; i < CENTERING_BREAKPOINTS.length - 1; i++) {
    const [r0, s0] = CENTERING_BREAKPOINTS[i]
    const [r1, s1] = CENTERING_BREAKPOINTS[i + 1]
    if (worstRatio >= r0 && worstRatio <= r1) {
      const t = (worstRatio - r0) / (r1 - r0)
      return s0 + t * (s1 - s0)
    }
  }

  return 100
}

// ── Score (0-100) → sub-grade (0-10) ─────────────────────────────────────────
//
// Breakpoints: score → sub-grade
const SUBGRADE_BREAKPOINTS: [score: number, subGrade: number][] = [
  [98, 10],
  [94, 9.5],
  [88, 9],
  [83, 8.5],
  [77, 8],
  [70, 7],
  [60, 6],
  [50, 5],
  [40, 4],
  [30, 3],
  [20, 2],
  [10, 1.5],
]
const SUBGRADE_FLOOR = 1

function rawToSubGrade(score: number): number {
  for (const [threshold, grade] of SUBGRADE_BREAKPOINTS) {
    if (score >= threshold) return grade
  }
  return SUBGRADE_FLOOR
}

// ── Compute sub-scores (0-100) ────────────────────────────────────────────────

function computeSubScores(
  centering: CenteringResult,
  surface: SurfaceResult,
  edges: EdgeResult,
  corners: CornerResult,
): GradeSubScores {
  return {
    centering: centeringRatioToScore(centering.lrRatio, centering.tbRatio),
    surface: surface.score,
    edges: edges.avgScore,
    corners: corners.avgScore,
  }
}

// ── Weighted average ──────────────────────────────────────────────────────────

function weightedScore(
  sub: GradeSubScores,
  wCentering: number,
  wSurface: number,
  wEdges: number,
  wCorners: number,
): number {
  return (
    sub.centering * wCentering +
    sub.surface * wSurface +
    sub.edges * wEdges +
    sub.corners * wCorners
  )
}

// ── PSA ───────────────────────────────────────────────────────────────────────
//
// PSA grades: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 (no half grades)
// Weights: centering 25%, surface 40%, edges 20%, corners 15%

function psaNumericToLabel(grade: number): string {
  switch (grade) {
    case 10: return 'Gem Mint 10'
    case 9:  return 'Mint 9'
    case 8:  return 'NM-MT 8'
    case 7:  return 'NM 7'
    case 6:  return 'EX-MT 6'
    case 5:  return 'EX 5'
    case 4:  return 'VG-EX 4'
    case 3:  return 'VG 3'
    case 2:  return 'Good 2'
    default: return 'Poor 1'
  }
}

function gradePSA(sub: GradeSubScores): GradeResult {
  const overall = weightedScore(sub, 0.25, 0.40, 0.20, 0.15)

  // Snap to whole-number PSA grades via sub-grade mapping then floor
  let rawGrade = rawToSubGrade(overall)
  // PSA has no half grades: round down to nearest whole number
  // Exception: 1.5 → 1
  let numeric: number
  if (rawGrade < 2) {
    numeric = 1
  } else {
    numeric = Math.floor(rawGrade)
  }

  return {
    numeric,
    label: psaNumericToLabel(numeric),
    subScores: sub,
  }
}

// ── BGS ───────────────────────────────────────────────────────────────────────
//
// BGS uses equal sub-grades (each is independently graded 0-10 in 0.5 steps).
// Black Label = all sub-grades 9.5+.
// Grade thresholds:
//   avg >= 9.875 → 10 Black Label
//   all >= 9.5   → 10 Pristine
//   avg >= 9.25 && min >= 9 → 9.5
//   avg >= 8.75 && min >= 8.5 → 9
//   avg >= 8.25 && min >= 8 → 8.5
//   avg >= 7.75 && min >= 7.5 → 8
//   avg >= 7.25 && min >= 7 → 7.5
//   avg >= 6.75 && min >= 6.5 → 7
//   avg >= 5.75 → 6
//   avg >= 4.75 → 5
//   avg >= 3.75 → 4
//   avg >= 2.75 → 3
//   avg >= 1.75 → 2
//   else → 1

function bgsSubGrade(score: number): number {
  // Round to nearest 0.5 in 1-10 range
  const raw = rawToSubGrade(score)
  return Math.round(raw * 2) / 2
}

function bgsDetermineGrade(subGrades: [number, number, number, number]): { numeric: number; label: string } {
  const [c, s, e, co] = subGrades
  const avg = (c + s + e + co) / 4
  const minSub = Math.min(c, s, e, co)
  const allAbove95 = subGrades.every(g => g >= 9.5)

  if (avg >= 9.875 && allAbove95) return { numeric: 10, label: 'Pristine 10 Black Label' }
  if (allAbove95) return { numeric: 10, label: 'Pristine 10' }
  if (avg >= 9.25 && minSub >= 9) return { numeric: 9.5, label: 'Gem Mint 9.5' }
  if (avg >= 8.75 && minSub >= 8.5) return { numeric: 9, label: 'Mint 9' }
  if (avg >= 8.25 && minSub >= 8) return { numeric: 8.5, label: 'NM-MT+ 8.5' }
  if (avg >= 7.75 && minSub >= 7.5) return { numeric: 8, label: 'NM-MT 8' }
  if (avg >= 7.25 && minSub >= 7) return { numeric: 7.5, label: 'NM+ 7.5' }
  if (avg >= 6.75 && minSub >= 6.5) return { numeric: 7, label: 'NM 7' }
  if (avg >= 5.75) return { numeric: 6, label: 'EX-MT 6' }
  if (avg >= 4.75) return { numeric: 5, label: 'EX 5' }
  if (avg >= 3.75) return { numeric: 4, label: 'VG-EX 4' }
  if (avg >= 2.75) return { numeric: 3, label: 'VG 3' }
  if (avg >= 1.75) return { numeric: 2, label: 'Good 2' }
  return { numeric: 1, label: 'Poor 1' }
}

function gradeBGS(sub: GradeSubScores): GradeResult {
  const subGrades: [number, number, number, number] = [
    bgsSubGrade(sub.centering),
    bgsSubGrade(sub.surface),
    bgsSubGrade(sub.edges),
    bgsSubGrade(sub.corners),
  ]

  const { numeric, label } = bgsDetermineGrade(subGrades)

  return {
    numeric,
    label,
    subScores: sub,
  }
}

// ── CGC ───────────────────────────────────────────────────────────────────────
//
// CGC weights: centering 30%, surface 35%, edges 20%, corners 15%
// CGC supports half grades (9.5).

function cgcNumericToLabel(grade: number): string {
  switch (grade) {
    case 10:  return 'Pristine 10'
    case 9.5: return 'Gem Mint 9.5'
    case 9:   return 'Mint 9'
    case 8.5: return 'NM/MT+ 8.5'
    case 8:   return 'NM/MT 8'
    case 7.5: return 'NM+ 7.5'
    case 7:   return 'NM 7'
    case 6.5: return 'EX/MT+ 6.5'
    case 6:   return 'EX/MT 6'
    case 5.5: return 'EX+ 5.5'
    case 5:   return 'EX 5'
    case 4.5: return 'VG/EX+ 4.5'
    case 4:   return 'VG/EX 4'
    case 3.5: return 'VG+ 3.5'
    case 3:   return 'VG 3'
    case 2.5: return 'Good+ 2.5'
    case 2:   return 'Good 2'
    case 1.5: return 'Fair 1.5'
    default:  return 'Poor 1'
  }
}

function gradeCGC(sub: GradeSubScores): GradeResult {
  const overall = weightedScore(sub, 0.30, 0.35, 0.20, 0.15)
  const rawGrade = rawToSubGrade(overall)

  // CGC supports half grades, round to nearest 0.5
  const numeric = Math.round(rawGrade * 2) / 2

  return {
    numeric,
    label: cgcNumericToLabel(numeric),
    subScores: sub,
  }
}

// ── SGC ───────────────────────────────────────────────────────────────────────
//
// SGC weights: same as PSA (centering 25%, surface 40%, edges 20%, corners 15%)
// SGC supports half grades.

function sgcNumericToLabel(grade: number): string {
  switch (grade) {
    case 10:  return 'Pristine 10'
    case 9.5: return 'Mint+ 9.5'
    case 9:   return 'Mint 9'
    case 8.5: return 'NM/MT+ 8.5'
    case 8:   return 'NM/MT 8'
    case 7.5: return 'NM+ 7.5'
    case 7:   return 'NM 7'
    case 6.5: return 'EX/MT+ 6.5'
    case 6:   return 'EX/MT 6'
    case 5.5: return 'EX+ 5.5'
    case 5:   return 'EX 5'
    case 4.5: return 'VG/EX+ 4.5'
    case 4:   return 'VG/EX 4'
    case 3.5: return 'VG+ 3.5'
    case 3:   return 'VG 3'
    case 2.5: return 'Good+ 2.5'
    case 2:   return 'Good 2'
    case 1.5: return 'Fair 1.5'
    default:  return 'Poor 1'
  }
}

function gradeSGC(sub: GradeSubScores): GradeResult {
  const overall = weightedScore(sub, 0.25, 0.40, 0.20, 0.15)
  const rawGrade = rawToSubGrade(overall)

  // SGC supports half grades, round to nearest 0.5
  const numeric = Math.round(rawGrade * 2) / 2

  return {
    numeric,
    label: sgcNumericToLabel(numeric),
    subScores: sub,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function estimateGrades(
  centering: CenteringResult,
  surface: SurfaceResult,
  edges: EdgeResult,
  corners: CornerResult,
): GradeEstimates {
  const sub = computeSubScores(centering, surface, edges, corners)

  return {
    psa: gradePSA(sub),
    bgs: gradeBGS(sub),
    cgc: gradeCGC(sub),
    sgc: gradeSGC(sub),
  }
}
