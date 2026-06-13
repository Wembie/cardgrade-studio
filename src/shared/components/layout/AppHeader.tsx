'use client'
import Link from 'next/link'

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 backdrop-blur-md bg-background/80 border-b border-border">
      <Link href="/" className="font-semibold text-foreground">
        CardGrade Studio
      </Link>
      <span className="ml-2 text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
        {process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.1'}
      </span>
    </header>
  )
}
