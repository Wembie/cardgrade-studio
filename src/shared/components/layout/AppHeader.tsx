'use client'

import React from 'react'
import Link from 'next/link'
import { ScanLine, Home } from 'lucide-react'
import { Badge } from '@/shared/components/ui/badge'

export default function AppHeader() {
  return (
    <header className="flex items-center gap-3 px-4 h-11 border-b border-border bg-card/80 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center glow-primary">
          <ScanLine className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm text-foreground">CardGrade Studio</span>
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary px-1.5 py-0 h-4">
          v{process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}
        </Badge>
      </div>
      <div className="ml-auto">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </Link>
      </div>
    </header>
  )
}
