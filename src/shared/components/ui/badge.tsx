import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        destructive: 'border-transparent bg-destructive/20 text-red-400 border-red-900/40',
        success: 'border-transparent bg-emerald-500/15 text-emerald-400 border-emerald-900/30',
        warning: 'border-transparent bg-amber-500/15 text-amber-400 border-amber-900/30',
        info: 'border-transparent bg-blue-500/15 text-blue-400 border-blue-900/30',
        gem: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
        mint: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        good: 'border-lime-500/30 bg-lime-500/10 text-lime-300',
        average: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        poor: 'border-red-500/30 bg-red-500/10 text-red-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
