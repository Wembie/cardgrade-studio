import { jsPDF } from 'jspdf'
import type {
  GradeResult,
  CenteringMeasurement,
  SurfaceAnalysis,
  EdgeAnalysis,
  ScanQuality,
} from '@/shared/types'

export interface ReportData {
  grades: GradeResult[]
  centering: CenteringMeasurement | null
  surface: SurfaceAnalysis | null
  edges: EdgeAnalysis | null
  quality: ScanQuality | null
  hasBack: boolean
}

const BG   = [8, 8, 16] as const
const FG   = [220, 220, 240] as const
const DIM  = [120, 120, 140] as const
const MUTED = [80, 80, 100] as const
const LINE  = [40, 40, 60] as const
const ACCENT = [120, 100, 255] as const
const WARN  = [200, 150, 50] as const

export function generatePDFReport(data: ReportData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210
  const M = 18
  let y = 22

  // ── helpers ──────────────────────────────────────────────────────────────────

  const fill = (c: readonly [number, number, number]) => doc.setTextColor(c[0], c[1], c[2])
  const hr = (gap = 4) => {
    y += gap
    doc.setDrawColor(LINE[0], LINE[1], LINE[2])
    doc.line(M, y, W - M, y)
    y += gap + 2
  }
  const h2 = (text: string) => {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    fill(ACCENT)
    doc.text(text.toUpperCase(), M, y)
    y += 6
  }
  const kv = (label: string, value: string) => {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    fill(DIM)
    doc.text(label, M + 2, y)
    doc.setFont('helvetica', 'bold')
    fill(FG)
    doc.text(value, M + 48, y)
    y += 5
  }
  const bar = (score: number, max = 10, label: string) => {
    const barW = 60
    const barH = 2.5
    const x = M + 2
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    fill(DIM)
    doc.text(label, x, y)
    doc.setFillColor(30, 30, 50)
    doc.roundedRect(x + 38, y - 2.5, barW, barH, 1, 1, 'F')
    const pct = Math.min(score / max, 1)
    const r = pct > 0.7 ? 80 : pct > 0.4 ? 200 : 220
    const g = pct > 0.7 ? 200 : pct > 0.4 ? 170 : 70
    const b = pct > 0.7 ? 120 : 60
    doc.setFillColor(r, g, b)
    doc.roundedRect(x + 38, y - 2.5, Math.max(barW * pct, 2), barH, 1, 1, 'F')
    doc.setFont('helvetica', 'bold')
    fill(FG)
    doc.text(`${score.toFixed(1)}`, x + 101, y)
    y += 5.5
  }

  // ── background ───────────────────────────────────────────────────────────────
  doc.setFillColor(BG[0], BG[1], BG[2])
  doc.rect(0, 0, 210, 297, 'F')

  // accent left strip
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2])
  doc.rect(0, 0, 3, 297, 'F')

  // ── header ───────────────────────────────────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  fill(FG)
  doc.text('CardGrade Studio', M, y)
  y += 7

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  fill(MUTED)
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  doc.text(`Automated Grading Report  ·  ${dateStr}`, M, y)
  y += 5

  if (!data.hasBack) {
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'italic')
    fill(WARN)
    doc.text('⚠  Estimated grade — front side only. Upload back for full analysis.', M, y)
    y += 5
  }

  hr(2)

  // ── grade estimates ───────────────────────────────────────────────────────────
  if (data.grades.length > 0) {
    h2('Grade Estimates')

    // 2-column layout
    const col = (W - M * 2) / 2
    const startY = y
    const companies = data.grades

    companies.forEach((g, i) => {
      const cx = M + (i % 2) * (col + 4)
      const cy = startY + Math.floor(i / 2) * 26

      // card bg
      doc.setFillColor(18, 18, 32)
      doc.roundedRect(cx, cy - 4, col - 4, 24, 2, 2, 'F')

      // company
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      fill(DIM)
      doc.text(g.company, cx + 4, cy + 1)

      // grade number
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      const gradeColor = g.grade >= 10 ? [100, 220, 170] : g.grade >= 9 ? [140, 190, 255] : [220, 180, 80]
      doc.setTextColor(gradeColor[0], gradeColor[1], gradeColor[2])
      doc.text(String(g.grade), cx + 4, cy + 11)

      // label
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      fill(DIM)
      doc.text(g.label, cx + 4, cy + 16)

      // confidence
      doc.setFontSize(6.5)
      fill(MUTED)
      doc.text(`${Math.round(g.confidence * 100)}% confidence`, cx + 4, cy + 20)
    })

    y = startY + Math.ceil(companies.length / 2) * 26 + 4

    // sub-grades breakdown for PSA
    const psa = data.grades.find((g) => g.company === 'PSA')
    if (psa) {
      y += 2
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      fill(MUTED)
      doc.text('Sub-scores (PSA)', M + 2, y)
      y += 5
      bar(psa.subGrades.centering, 10, 'Centering')
      bar(psa.subGrades.surface, 10, 'Surface')
      bar(psa.subGrades.edges, 10, 'Edges')
      bar(psa.subGrades.corners, 10, 'Corners')
    }

    hr()
  }

  // ── centering ─────────────────────────────────────────────────────────────────
  if (data.centering) {
    h2('Centering')
    kv('Left / Right', data.centering.leftRight)
    kv('Top / Bottom', data.centering.topBottom)
    kv('Assessment', data.centering.assessment)
    kv('LR Deviation', `${data.centering.lrDeviation.toFixed(1)}%`)
    kv('TB Deviation', `${data.centering.tbDeviation.toFixed(1)}%`)
    hr()
  }

  // ── surface ───────────────────────────────────────────────────────────────────
  if (data.surface) {
    h2('Surface Analysis')
    bar(data.surface.overallScore, 10, 'Overall')
    bar(data.surface.whiteningScore, 10, 'Whitening')
    bar(data.surface.scratchScore, 10, 'Scratches')
    bar(data.surface.printQualityScore, 10, 'Print Quality')
    if (data.surface.defects.length > 0) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      fill(DIM)
      doc.text(`${data.surface.defects.length} defect${data.surface.defects.length > 1 ? 's' : ''} detected`, M + 2, y)
      y += 5
    }
    hr()
  }

  // ── edges ─────────────────────────────────────────────────────────────────────
  if (data.edges) {
    h2('Edge & Corner Analysis')
    bar(data.edges.edgeScore, 10, 'Edges')
    bar(data.edges.cornerScore, 10, 'Corners')
    hr()
  }

  // ── scan quality ──────────────────────────────────────────────────────────────
  if (data.quality) {
    h2('Scan Quality')
    kv('Score', `${data.quality.score} / 100`)
    kv('Status', data.quality.pass ? '✓ Pass' : '✗ Fail')
    if (data.quality.issues.length > 0) {
      kv('Issues', data.quality.issues.join(', '))
    }
    hr()
  }

  // ── disclaimer ────────────────────────────────────────────────────────────────
  y += 2
  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  fill(MUTED)
  const disclaimer =
    'DISCLAIMER: This report is generated by computer vision for personal reference only. It is not an official grade from PSA, BGS, CGC, SGC, or any grading company. Results may differ from professional grading services.'
  const lines = doc.splitTextToSize(disclaimer, W - M * 2 - 4)
  doc.text(lines, M + 2, y)

  // ── footer ────────────────────────────────────────────────────────────────────
  doc.setFontSize(6.5)
  doc.setFont('helvetica', 'normal')
  fill(LINE)
  doc.text('CardGrade Studio  ·  Free  ·  No AI  ·  No data collection', M, 291)

  doc.save('cardgrade-report.pdf')
}
