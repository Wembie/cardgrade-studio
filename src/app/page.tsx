'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ScanLine, Crosshair, Activity, Layers, Zap, Shield,
  ArrowRight, Upload, Star, ChevronRight
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'

const FEATURES = [
  {
    icon: Crosshair,
    title: 'Precision Centering',
    desc: 'Pixel-perfect border measurement with interactive drag lines, snap detection, and real-time L/R T/B ratios.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    icon: Activity,
    title: 'Surface Analysis',
    desc: 'Detect whitening, scratches, print defects, and stains using classical CV edge detection and texture analysis.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Layers,
    title: 'Edge & Corner Grading',
    desc: 'Microscopic analysis of all 4 edges and corners. Whitening ratio, roughness index, chip detection.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: Star,
    title: 'Multi-Company Grades',
    desc: 'Heuristic grading engine calibrated for PSA, BGS, CGC, and SGC — with per-company weight profiles.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Zap,
    title: '100% In-Browser',
    desc: 'OpenCV.js + Web Workers process everything locally. Your cards never leave your device.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Shield,
    title: 'Offline-First PWA',
    desc: 'Install as a native app. Works completely offline. IndexedDB persistence. No cloud, no accounts.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
]

const GRADE_EXAMPLES = [
  { company: 'PSA', grade: '10', label: 'Gem Mint', color: 'text-cyan-300' },
  { company: 'BGS', grade: '9.5', label: 'Gem Mint', color: 'text-purple-300' },
  { company: 'CGC', grade: '10', label: 'Pristine', color: 'text-orange-300' },
  { company: 'SGC', grade: '9.5', label: 'Mint+', color: 'text-green-300' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center glow-primary">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">CardGrade Studio</span>
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">Beta</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/analyze">
              <Button size="sm" variant="ghost">Open App</Button>
            </Link>
            <Link href="/analyze">
              <Button size="sm">
                Start Grading
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative py-24 px-6 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
            <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] rounded-full bg-violet-500/8 blur-[80px]" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-xs text-muted-foreground mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                No backend · No AI cloud · 100% browser · Free forever
              </div>

              <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-none">
                <span className="text-foreground">Professional </span>
                <span className="text-gradient">Card Grading</span>
                <br />
                <span className="text-foreground">in Your Browser</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
                Analyze centering, surface defects, edges, and corners with OpenCV.js.
                Get PSA, BGS, CGC, and SGC grade estimates — all locally, all offline.
              </p>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <Link href="/analyze">
                  <Button size="lg" className="gap-2 text-base px-8 glow-primary">
                    <Upload className="w-4 h-4" />
                    Start Analyzing
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/analyze">
                  <Button size="lg" variant="outline" className="gap-2 text-base">
                    View Demo
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Grade preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mt-16 grid grid-cols-4 gap-3 max-w-lg mx-auto"
            >
              {GRADE_EXAMPLES.map((g, i) => (
                <motion.div
                  key={g.company}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="bg-card border border-border rounded-xl p-3 text-center surface-highlight"
                >
                  <div className="text-xs text-muted-foreground mb-1">{g.company}</div>
                  <div className={`text-2xl font-black tabular ${g.color}`}>{g.grade}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{g.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Features grid */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Professional-grade tools</h2>
              <p className="text-muted-foreground">Every analysis module runs in your browser using classical computer vision.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-xl border p-5 bg-card surface-highlight ${f.border}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${f.bg} ${f.color} border ${f.border}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-card border border-border rounded-2xl p-10 surface-highlight relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-violet-500/5 pointer-events-none" />
              <h2 className="text-3xl font-bold mb-4 relative">
                Ready to grade your cards?
              </h2>
              <p className="text-muted-foreground mb-8 relative">
                Upload a card image and get a professional analysis in seconds.
                No sign-up. No payment. No data leaving your device.
              </p>
              <Link href="/analyze">
                <Button size="lg" className="gap-2 glow-primary relative">
                  <ScanLine className="w-4 h-4" />
                  Open CardGrade Studio
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 px-6 text-center text-sm text-muted-foreground">
        CardGrade Studio — Open source · MIT License · No backend · No AI · No tracking
      </footer>
    </div>
  )
}
