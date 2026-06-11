'use client'

import * as React from 'react'
import { cn } from '@/shared/lib/utils'

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative overflow-hidden', className)}
    {...props}
  >
    <div className="h-full w-full overflow-y-auto overflow-x-hidden rounded-[inherit]">
      {children}
    </div>
  </div>
))
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
