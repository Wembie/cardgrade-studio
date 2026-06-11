import type {
  GradeResult,
  GradingCompany,
  CenteringMeasurement,
  SurfaceAnalysis,
  EdgeAnalysis,
  SubGrades,
} from '@/shared/types'
import { round } from '@/shared/lib/utils'

// ── Company Weights ────────────────────────────────────────────────────────

interface CompanyConfig {
  weights: { centering: number; surface: number; edges: number; corners: number }
  gradeScale: GradePoint[]
  centeringTolerances: Record<number, { maxLR: number; maxTB: number }>
}

interface GradePoint {
  grade: number
  label: string
  minScore: number
}

const PSA_CONFIG: CompanyConfig = {
  weights: { centering: 0.35, surface: 0.30, edges: 0.20, corners: 0.15 },
  gradeScale: [
    { grade: 10, label: 'Gem Mint',      minScore: 9.5 },
    { grade: 9,  label: 'Mint',          minScore: 8.8 },
    { grade: 8,  label: 'NM-MT',         minScore: 8.0 },
    { grade: 7,  label: 'Near Mint',     minScore: 7.0 },
    { grade: 6,  label: 'EX-MT',         minScore: 6.0 },
    { grade: 5,  label: 'Excellent',     minScore: 5.0 },
    { grade: 4,  label: 'VG-EX',         minScore: 4.0 },
    { grade: 3,  label: 'Very Good',     minScore: 3.0 },
    { grade: 2,  label: 'Good',          minScore: 2.0 },
    { grade: 1,  label: 'Poor',          minScore: 0   },
  ],
  centeringTolerances: {
    10: { maxLR: 5, maxTB: 5 },    // 55/45
    9:  { maxLR: 10, maxTB: 10 },  // 60/40
    8:  { maxLR: 15, maxTB: 15 },  // 65/35
    7:  { maxLR: 20, maxTB: 20 },  // 70/30
    6:  { maxLR: 25, maxTB: 25 },  // 75/25
  },
}

const BGS_CONFIG: CompanyConfig = {
  // BGS weighs corners more heavily
  weights: { centering: 0.25, surface: 0.30, edges: 0.20, corners: 0.25 },
  gradeScale: [
    { grade: 10,  label: 'Pristine',    minScore: 9.85 },
    { grade: 9.5, label: 'Gem Mint',    minScore: 9.4  },
    { grade: 9,   label: 'Mint',        minScore: 8.7  },
    { grade: 8.5, label: 'NM-MT+',     minScore: 8.3  },
    { grade: 8,   label: 'NM-MT',       minScore: 7.5  },
    { grade: 7.5, label: 'NM+',         minScore: 7.0  },
    { grade: 7,   label: 'Near Mint',   minScore: 6.3  },
    { grade: 6.5, label: 'EX-MT+',     minScore: 5.8  },
    { grade: 6,   label: 'EX-MT',       minScore: 5.0  },
    { grade: 5.5, label: 'EX+',         minScore: 4.5  },
    { grade: 5,   label: 'Excellent',   minScore: 3.5  },
    { grade: 4,   label: 'Very Good',   minScore: 2.5  },
    { grade: 3,   label: 'Good',        minScore: 1.5  },
    { grade: 2,   label: 'Fair',        minScore: 0.8  },
    { grade: 1,   label: 'Poor',        minScore: 0    },
  ],
  centeringTolerances: {
    10: { maxLR: 5, maxTB: 5 },
    9.5: { maxLR: 5, maxTB: 5 },
    9:   { maxLR: 10, maxTB: 10 },
    8.5: { maxLR: 12, maxTB: 12 },
    8:   { maxLR: 15, maxTB: 15 },
  },
}

const CGC_CONFIG: CompanyConfig = {
  weights: { centering: 0.30, surface: 0.35, edges: 0.18, corners: 0.17 },
  gradeScale: [
    { grade: 10,  label: 'Pristine',    minScore: 9.8  },
    { grade: 9.5, label: 'Gem Mint+',   minScore: 9.3  },
    { grade: 9,   label: 'Mint',        minScore: 8.6  },
    { grade: 8.5, label: 'Near Mint/Mint+', minScore: 8.0 },
    { grade: 8,   label: 'Near Mint/Mint',  minScore: 7.3 },
    { grade: 7.5, label: 'Near Mint+',  minScore: 6.8  },
    { grade: 7,   label: 'Near Mint',   minScore: 6.0  },
    { grade: 6,   label: 'Fine/Near Mint', minScore: 5.0 },
    { grade: 5,   label: 'Fine',        minScore: 4.0  },
    { grade: 4,   label: 'Very Fine',   minScore: 3.0  },
    { grade: 3,   label: 'Fine',        minScore: 2.0  },
    { grade: 2,   label: 'Good',        minScore: 1.0  },
    { grade: 1,   label: 'Poor',        minScore: 0    },
  ],
  centeringTolerances: {
    10:  { maxLR: 5,  maxTB: 5  },
    9.5: { maxLR: 8,  maxTB: 8  },
    9:   { maxLR: 12, maxTB: 12 },
    8.5: { maxLR: 15, maxTB: 15 },
  },
}

const SGC_CONFIG: CompanyConfig = {
  weights: { centering: 0.30, surface: 0.30, edges: 0.20, corners: 0.20 },
  gradeScale: [
    { grade: 10,  label: 'Pristine',    minScore: 9.7  },
    { grade: 9.5, label: 'Mint+',       minScore: 9.2  },
    { grade: 9,   label: 'Mint',        minScore: 8.5  },
    { grade: 8.5, label: 'NM-MT+',     minScore: 8.0  },
    { grade: 8,   label: 'NM-MT',       minScore: 7.2  },
    { grade: 7.5, label: 'NM+',         minScore: 6.7  },
    { grade: 7,   label: 'NM',          minScore: 6.0  },
    { grade: 6,   label: 'EX-MT',       minScore: 5.0  },
    { grade: 5,   label: 'EX',          minScore: 4.0  },
    { grade: 4,   label: 'VG-EX',       minScore: 3.0  },
    { grade: 3,   label: 'VG',          minScore: 2.0  },
    { grade: 2,   label: 'Good',        minScore: 1.0  },
    { grade: 1,   label: 'Poor',        minScore: 0    },
  ],
  centeringTolerances: {
    10:  { maxLR: 5,  maxTB: 5  },
    9.5: { maxLR: 8,  maxTB: 8  },
    9:   { maxLR: 12, maxTB: 12 },
    8:   { maxLR: 18, maxTB: 18 },
  },
}

const CONFIGS: Record<GradingCompany, CompanyConfig> = {
  PSA: PSA_CONFIG,
  BGS: BGS_CONFIG,
  CGC: CGC_CONFIG,
  SGC: SGC_CONFIG,
}

// ── Grade Engine ────────────────────────────────────────────────────────────

export function estimateGrade(
  company: GradingCompany,
  centering: CenteringMeasurement,
  surface: SurfaceAnalysis,
  edges: EdgeAnalysis
): GradeResult {
  const config = CONFIGS[company]
  const flags: string[] = []

  const subGrades: SubGrades = {
    centering: centering.score,
    surface: surface.overallScore,
    edges: edges.edgeScore,
    corners: edges.cornerScore,
  }

  // Weighted composite score
  const { weights } = config
  const composite =
    subGrades.centering * weights.centering +
    subGrades.surface * weights.surface +
    subGrades.edges * weights.edges +
    subGrades.corners * weights.corners

  // Apply hard centering caps per company tolerances
  let cappedScore = composite
  const maxGrade = getMaxGradeFromCentering(config, centering.lrDeviation, centering.tbDeviation)

  if (maxGrade !== null) {
    const cappedByGrade = gradeToScore(config, maxGrade)
    if (cappedScore > cappedByGrade) {
      cappedScore = cappedByGrade
      flags.push(`Centering ${centering.leftRight} caps grade at ${company} ${maxGrade}`)
    }
  }

  // Hard floor rules: if corners dinged or major scratch, cap the grade
  const hasDingedCorner = Object.values(edges.corners).some((c) => c.dinged)
  if (hasDingedCorner) {
    cappedScore = Math.min(cappedScore, 8.2)
    flags.push('Dinged corner detected — grade capped')
  }

  const hasMajorDefect = surface.defects.some((d) => d.severity === 'major')
  if (hasMajorDefect) {
    cappedScore = Math.min(cappedScore, 7.5)
    flags.push('Major surface defect detected')
  }

  // Map to grade scale
  const { grade, label } = scoreToGrade(config, cappedScore)

  // Confidence: lower if card bounds were uncertain or defects are borderline
  const confidence = calculateConfidence(subGrades, surface.defects.length)

  return {
    company,
    grade,
    label,
    subGrades,
    confidence,
    flags,
  }
}

export function estimateAllGrades(
  centering: CenteringMeasurement,
  surface: SurfaceAnalysis,
  edges: EdgeAnalysis
): GradeResult[] {
  const companies: GradingCompany[] = ['PSA', 'BGS', 'CGC', 'SGC']
  return companies.map((c) => estimateGrade(c, centering, surface, edges))
}

function getMaxGradeFromCentering(
  config: CompanyConfig,
  lrDev: number,
  tbDev: number
): number | null {
  const grades = Object.keys(config.centeringTolerances)
    .map(Number)
    .sort((a, b) => b - a)

  for (const grade of grades) {
    const tol = config.centeringTolerances[grade]
    if (lrDev <= tol.maxLR && tbDev <= tol.maxTB) return grade
  }
  return null
}

function gradeToScore(config: CompanyConfig, targetGrade: number): number {
  const point = config.gradeScale.find((g) => g.grade === targetGrade)
  return point ? point.minScore : 0
}

function scoreToGrade(config: CompanyConfig, score: number): { grade: number; label: string } {
  for (const point of config.gradeScale) {
    if (score >= point.minScore) {
      return { grade: point.grade, label: point.label }
    }
  }
  return { grade: 1, label: 'Poor' }
}

function calculateConfidence(subGrades: SubGrades, defectCount: number): number {
  const avg = (subGrades.centering + subGrades.surface + subGrades.edges + subGrades.corners) / 4
  // High variance in sub-grades = less confidence
  const values = Object.values(subGrades)
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  const stdDev = Math.sqrt(variance)

  let conf = 0.9
  conf -= Math.min(0.2, stdDev * 0.05)  // high variance = less confidence
  conf -= Math.min(0.1, defectCount * 0.02)  // many defects = borderline
  return round(Math.max(0.5, Math.min(0.98, conf)), 2)
}

// ── Grade metadata helpers ──────────────────────────────────────────────────

export function gradeColor(grade: number): string {
  if (grade >= 9.5) return 'var(--grade-gem-rgb)'
  if (grade >= 8) return 'var(--grade-mint-rgb)'
  if (grade >= 6) return 'var(--grade-good-rgb)'
  if (grade >= 4) return 'var(--grade-avg-rgb)'
  return 'var(--grade-poor-rgb)'
}

export function gradeTailwindColor(grade: number): string {
  if (grade >= 9.5) return 'text-cyan-400'
  if (grade >= 8) return 'text-emerald-400'
  if (grade >= 6) return 'text-lime-400'
  if (grade >= 4) return 'text-amber-400'
  return 'text-red-400'
}

export function gradeDescription(company: GradingCompany, grade: number): string {
  const config = CONFIGS[company]
  return config.gradeScale.find((g) => g.grade === grade)?.label ?? 'Unknown'
}
