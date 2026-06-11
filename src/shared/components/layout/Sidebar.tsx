'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ScanLine, LayoutDashboard, History, Settings, FolderOpen, ChevronRight
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/',          label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/analyze',   label: 'Analyze',     icon: ScanLine        },
  { href: '/collection', label: 'Collection', icon: FolderOpen      },
  { href: '/history',   label: 'History',     icon: History         },
]

interface SidebarProps {
  collapsed?: boolean
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          'flex flex-col h-full border-r border-border',
          'bg-card surface-highlight',
          'transition-all duration-300',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-2.5 px-3 py-4 border-b border-border',
          collapsed && 'justify-center px-2'
        )}>
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 glow-primary">
            <ScanLine className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold text-foreground leading-none">CardGrade</div>
              <div className="text-xs text-muted-foreground leading-none mt-0.5">Studio</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

            return collapsed ? (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center w-full h-9 rounded-md',
                      'transition-all duration-150',
                      active
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm',
                  'transition-all duration-150 group relative',
                  active
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                {active && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-md bg-primary/10 border border-primary/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className="w-4 h-4 relative z-10 flex-shrink-0" />
                <span className="relative z-10 flex-1">{item.label}</span>
                {item.badge && (
                  <span className="relative z-10 text-xs bg-primary/20 text-primary rounded px-1.5 py-0.5">
                    {item.badge}
                  </span>
                )}
                {active && (
                  <ChevronRight className="w-3.5 h-3.5 relative z-10 text-primary opacity-60" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className={cn('p-2 border-t border-border space-y-0.5', collapsed && 'flex flex-col items-center')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm',
                  'text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors',
                  collapsed && 'justify-center w-full px-0'
                )}
              >
                <Settings className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>Settings</span>}
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>

          {/* Version badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-default select-none',
                  collapsed ? 'justify-center' : ''
                )}
              >
                {!collapsed ? (
                  <span className="text-xs tabular text-muted-foreground/50 font-mono">
                    v{process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}
                  </span>
                ) : (
                  <span className="text-[10px] tabular text-muted-foreground/40 font-mono leading-none">
                    {(process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev').split('.')[0]}
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side={collapsed ? 'right' : 'top'}>
              CardGrade Studio v{process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev'}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
}
