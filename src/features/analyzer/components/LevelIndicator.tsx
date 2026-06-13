'use client'

import type { CardCorners } from '@/shared/types'

interface LevelIndicatorProps {
  corners: CardCorners | null
}

function getAngle(corners: CardCorners): number {
  const [TL, TR] = corners
  return Math.atan2(TR.y - TL.y, TR.x - TL.x) * (180 / Math.PI)
}

function getBubblePercent(angle: number): number {
  const clamped = Math.max(-10, Math.min(10, angle))
  // Map [-10, 10] to [-50, 50] percent
  return (clamped / 10) * 50
}

function getColor(angle: number): { bubble: string; glow: string } {
  const abs = Math.abs(angle)
  if (abs < 1)  return { bubble: '#10B981', glow: 'rgba(16, 185, 129, 0.5)' }  // green-500
  if (abs < 3)  return { bubble: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)' }  // amber-500
  return             { bubble: '#EF4444', glow: 'rgba(239, 68, 68, 0.5)' }      // red-500
}

function formatAngleText(angle: number): string {
  const abs = Math.abs(angle)
  if (abs < 0.15) return 'Perfectly level'
  const dir = angle > 0 ? 'right' : 'left'
  return `${abs.toFixed(1)}° ${dir}`
}

export function LevelIndicator({ corners }: LevelIndicatorProps) {
  if (!corners) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-48 h-6 rounded-full bg-secondary border border-border" />
        <p className="text-xs text-muted-foreground">No image loaded</p>
      </div>
    )
  }

  const angle = getAngle(corners)
  const bubblePercent = getBubblePercent(angle)
  const { bubble, glow } = getColor(angle)
  const isPerfect = Math.abs(angle) < 0.15

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      {/* Tube */}
      <div
        className="relative w-48 h-6 rounded-full bg-secondary border border-border overflow-hidden"
        aria-label="Level indicator"
      >
        {/* Center tick mark */}
        <div className="absolute left-1/2 top-1 bottom-1 w-px bg-border -translate-x-1/2" />

        {/* Bubble */}
        <div
          className="absolute top-1 bottom-1 w-4 rounded-full transition-all duration-200"
          style={{
            left: `calc(50% + ${bubblePercent}% - 8px)`,
            background: bubble,
            boxShadow: `0 0 8px ${glow}, 0 0 3px ${glow}`,
          }}
        />
      </div>

      {/* Text label */}
      <p
        className="text-xs font-mono tabular"
        style={{ color: bubble }}
      >
        {isPerfect ? (
          <span>{formatAngleText(angle)} ✓</span>
        ) : (
          formatAngleText(angle)
        )}
      </p>
    </div>
  )
}
