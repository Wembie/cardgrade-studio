import { laplacianVariance, meanLuminance, glareRatio } from '@/shared/lib/math'
import type { ScanQuality, ScanQualityIssue } from '@/shared/types'

const MIN_BLUR_VARIANCE = 50        // Below this = blurry
const MIN_BRIGHTNESS = 0.15         // Too dark
const MAX_BRIGHTNESS = 0.92         // Too bright/overexposed
const MAX_GLARE_RATIO = 0.08        // 8% glare is too much
const MIN_WIDTH = 400
const MIN_HEIGHT = 550

/**
 * Check scan quality before running expensive CV analysis.
 * Returns a quality report with issues and a 0-100 score.
 */
export function checkScanQuality(imageData: ImageData): ScanQuality {
  const { width, height, data } = imageData
  const issues: ScanQualityIssue[] = []
  let score = 100

  // ── Resolution ───────────────────────────────────────────────────────────
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    issues.push('low_resolution')
    score -= 30
  }

  // ── Blur detection (Laplacian variance) ──────────────────────────────────
  const blurScore = laplacianVariance(data, width, height)
  if (blurScore < MIN_BLUR_VARIANCE) {
    issues.push('blurry')
    score -= Math.min(25, (MIN_BLUR_VARIANCE - blurScore) / MIN_BLUR_VARIANCE * 25)
  }

  // ── Brightness ───────────────────────────────────────────────────────────
  const brightness = meanLuminance(data)
  if (brightness < MIN_BRIGHTNESS) {
    issues.push('dark')
    score -= 15
  } else if (brightness > MAX_BRIGHTNESS) {
    issues.push('overexposed')
    score -= 10
  }

  // ── Glare ────────────────────────────────────────────────────────────────
  const glare = glareRatio(data)
  if (glare > MAX_GLARE_RATIO) {
    issues.push('glare')
    score -= Math.min(20, glare * 100)
  }

  return {
    pass: issues.length === 0 || (score >= 50 && !issues.includes('card_not_found')),
    score: Math.max(0, Math.round(score)),
    issues,
    resolution: { width, height },
    blurScore: Math.round(blurScore * 10) / 10,
    brightnessScore: Math.round(brightness * 100) / 100,
    glareScore: Math.round(glare * 100) / 100,
  }
}
