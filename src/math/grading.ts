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
// Breakpoints derived from published PSA/BGS/CGC/SGC centering tolerance charts.
// ratio = max(L,R) / min(L,R) where 55/45 → 1.222, 60/40 → 1.5, etc.
// Linear interpolation between breakpoints.

const CENTERING_BREAKPOINTS: [ratio: number, score: number][] = [
  [1.0,   100],  // 50/50 perfect
  [1.222, 98],   // 55/45 — Gem Mint 10 front threshold (PSA/BGS/CGC/SGC)
  [1.5,   90],   // 60/40 — Mint 9 threshold
  [1.857, 80],   // 65/35 — NM-MT 8 threshold
  [2.333, 70],   // 70/30 — NM 7 threshold
  [4.0,   62],   // 80/20 — EX-MT 6 threshold
  [5.667, 50],   // 85/15 — EX 5 threshold
  [9.0,   30],   // 90/10 — VG 3 threshold
]
const CENTERING_FLOOR_SCORE = 15

function centeringRatioToScore(lrRatio: number, tbRatio: number): number {
  const worstRatio = Math.max(lrRatio, tbRatio)

  if (worstRatio >= CENTERING_BREAKPOINTS[CENTERING_BREAKPOINTS.length - 1][0]) {
    return CENTERING_FLOOR_SCORE
  }

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
// Breakpoints calibrated to centering thresholds above so that:
//   ratio 1.222 (55/45) → score 98 → grade 10
//   ratio 1.5   (60/40) → score 90 → grade 9
//   ratio 1.857 (65/35) → score 80 → grade 8
//   ratio 2.333 (70/30) → score 70 → grade 7
//   ratio 4.0   (80/20) → score 62 → grade 6
//   ratio 5.667 (85/15) → score 50 → grade 5
//   ratio 9.0   (90/10) → score 30 → grade 3

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
// PSA grades: 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 (whole numbers only).
// Weights: centering 25%, surface 40%, edges 20%, corners 15%.

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
  const rawGrade = rawToSubGrade(overall)
  // PSA has no half grades — floor to nearest whole number
  const numeric = rawGrade < 2 ? 1 : Math.floor(rawGrade)

  return {
    numeric,
    label: psaNumericToLabel(numeric),
    subScores: sub,
  }
}

// ── BGS ───────────────────────────────────────────────────────────────────────
//
// BGS sub-grades each scored 1–10 in 0.5 steps.
// Black Label: ALL four sub-grades exactly 10.0.
// Pristine 10: all sub-grades ≥ 9.5 with avg ≥ 9.875 (e.g. 10/10/10/9.5).
// Gem Mint 9.5: avg ≥ 9.25 and min ≥ 9.0.
// Centering sub-grade uses stricter thresholds than the other dimensions:
//   BGS centering 10 requires ~50/50 (score ≥ 99.5).
//   BGS centering 9.5 = 55/45 (score ≥ 97). rawToSubGrade(98) → 10 is wrong here.

function bgsSubGrade(score: number): number {
  return Math.round(rawToSubGrade(score) * 2) / 2
}

// Centering-specific sub-grade for BGS — tighter than bgsSubGrade.
// Source: Beckett published centering tolerances (gradingmetric.com, beckett.com/grading/scale).
const BGS_CENTERING_BREAKPOINTS: [score: number, subGrade: number][] = [
  [99.5, 10],  // ~50/50 (Black Label / Pristine centering)
  [97,   9.5], // ~55/45 (Gem Mint centering)
  [87,   9],   // ~60/40
  [81,   8.5], // ~65/35
  [75,   8],   // ~70/30
  [67,   7.5],
  [60,   7],
  [50,   6],
  [40,   5],
  [30,   4],
  [20,   3],
  [10,   2],
]

function bgsCenteringSubGrade(score: number): number {
  for (const [threshold, grade] of BGS_CENTERING_BREAKPOINTS) {
    if (score >= threshold) return grade
  }
  return 1.5
}

function bgsDetermineGrade(subGrades: [number, number, number, number]): { numeric: number; label: string } {
  const [c, s, e, co] = subGrades
  const avg    = (c + s + e + co) / 4
  const minSub = Math.min(c, s, e, co)
  const allTen     = subGrades.every(g => g === 10)
  const allAbove95 = subGrades.every(g => g >= 9.5)

  // Strictest first — Black Label requires all exactly 10
  if (allTen)                         return { numeric: 10,  label: 'Black Label 10' }
  if (allAbove95 && avg >= 9.875)     return { numeric: 10,  label: 'Pristine 10' }
  if (avg >= 9.25 && minSub >= 9)     return { numeric: 9.5, label: 'Gem Mint 9.5' }
  if (avg >= 8.75 && minSub >= 8.5)   return { numeric: 9,   label: 'Mint 9' }
  if (avg >= 8.25 && minSub >= 8)     return { numeric: 8.5, label: 'NM-MT+ 8.5' }
  if (avg >= 7.75 && minSub >= 7.5)   return { numeric: 8,   label: 'NM-MT 8' }
  if (avg >= 7.25 && minSub >= 7)     return { numeric: 7.5, label: 'NM+ 7.5' }
  if (avg >= 6.75 && minSub >= 6.5)   return { numeric: 7,   label: 'NM 7' }
  if (avg >= 5.75)                    return { numeric: 6,   label: 'EX-MT 6' }
  if (avg >= 4.75)                    return { numeric: 5,   label: 'EX 5' }
  if (avg >= 3.75)                    return { numeric: 4,   label: 'VG-EX 4' }
  if (avg >= 2.75)                    return { numeric: 3,   label: 'VG 3' }
  if (avg >= 1.75)                    return { numeric: 2,   label: 'Good 2' }
  return                               { numeric: 1,   label: 'Poor 1' }
}

function gradeBGS(sub: GradeSubScores): GradeResult {
  const subGrades: [number, number, number, number] = [
    bgsCenteringSubGrade(sub.centering),  // stricter: 50/50 required for centering 10
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
// Weights: centering 30%, surface 35%, edges 20%, corners 15%.
// Pristine 10: ~50/50 centering + all criteria flawless (centering score ≥ 99.5).
// Gem Mint 10: overall 10 but centering up to 55/45 (centering score < 99.5).

function cgcNumericToLabel(grade: number, centeringScore: number): string {
  if (grade === 10) return centeringScore >= 99.5 ? 'Pristine 10' : 'Gem Mint 10'
  switch (grade) {
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

function gradeCGC(sub: GradeSubScores): GradeResult {
  const overall  = weightedScore(sub, 0.30, 0.35, 0.20, 0.15)
  const rawGrade = rawToSubGrade(overall)
  const numeric  = Math.round(rawGrade * 2) / 2

  return {
    numeric,
    label: cgcNumericToLabel(numeric, sub.centering),
    subScores: sub,
  }
}

// ── SGC ───────────────────────────────────────────────────────────────────────
//
// Weights: centering 25%, surface 40%, edges 20%, corners 15%.
// Gold Label Pristine 10: 50/50 centering (centering score ≥ 99.5).
// Gem Mint 10: up to 55/45 front.

function sgcNumericToLabel(grade: number, centeringScore: number): string {
  if (grade === 10) return centeringScore >= 99.5 ? 'Gold Label Pristine 10' : 'Gem Mint 10'
  switch (grade) {
    case 9.5: return 'Mint+ 9.5'
    case 9:   return 'Mint 9'
    case 8.5: return 'NM-MT+ 8.5'
    case 8:   return 'NM-MT 8'
    case 7.5: return 'NM+ 7.5'
    case 7:   return 'NM 7'
    case 6.5: return 'EX-MT+ 6.5'
    case 6:   return 'EX-MT 6'
    case 5.5: return 'EX+ 5.5'
    case 5:   return 'EX 5'
    case 4.5: return 'VG-EX+ 4.5'
    case 4:   return 'VG-EX 4'
    case 3.5: return 'VG+ 3.5'
    case 3:   return 'VG 3'
    case 2.5: return 'Good+ 2.5'
    case 2:   return 'Good 2'
    case 1.5: return 'Fair 1.5'
    default:  return 'Poor 1'
  }
}

function gradeSGC(sub: GradeSubScores): GradeResult {
  const overall  = weightedScore(sub, 0.25, 0.40, 0.20, 0.15)
  const rawGrade = rawToSubGrade(overall)
  const numeric  = Math.round(rawGrade * 2) / 2

  return {
    numeric,
    label: sgcNumericToLabel(numeric, sub.centering),
    subScores: sub,
  }
}

// ── TAG ───────────────────────────────────────────────────────────────────────
//
// TAG (Technical Authentication & Grading) uses a 1000-point numeric system
// internally, expressed as grades 1–10 with half-steps.
// Weights: centering 35%, surface 30%, edges 20%, corners 15%
// (TAG emphasizes centering heavily for TCG cards).
// 10P Pristine: ~50/50 centering (centering score ≥ 99.5) + flawless.
// 10 Gem Mint: up to 55/45 centering.

function tagNumericToLabel(grade: number, centeringScore: number): string {
  if (grade === 10) return centeringScore >= 99.5 ? '10P Pristine' : '10 Gem Mint'
  switch (grade) {
    case 9.5: return '9.5 Mint+'
    case 9:   return '9 Mint'
    case 8.5: return '8.5 NM-MT+'
    case 8:   return '8 NM-MT'
    case 7.5: return '7.5 NM+'
    case 7:   return '7 NM'
    case 6.5: return '6.5 EX-MT+'
    case 6:   return '6 EX-MT'
    case 5.5: return '5.5 EX+'
    case 5:   return '5 EX'
    case 4.5: return '4.5 VG-EX+'
    case 4:   return '4 VG-EX'
    case 3.5: return '3.5 VG+'
    case 3:   return '3 VG'
    case 2:   return '2 Good'
    default:  return '1 Poor'
  }
}

function gradeTAG(sub: GradeSubScores): GradeResult {
  const overall  = weightedScore(sub, 0.35, 0.30, 0.20, 0.15)
  const rawGrade = rawToSubGrade(overall)
  const numeric  = Math.round(rawGrade * 2) / 2

  return {
    numeric,
    label: tagNumericToLabel(numeric, sub.centering),
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
    tag: gradeTAG(sub),
  }
}
