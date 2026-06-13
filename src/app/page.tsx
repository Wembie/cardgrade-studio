'use client'

import React, { useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight,
  Upload,
  Crosshair,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Clock,
  ScanLine,
  ChevronRight,
  Star,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'

// ─── Animation variants ────────────────────────────────────────────────────

const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

// ─── Data ──────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Upload,
    title: 'Drop Your Card Photo',
    desc: 'Take a clear photo of your card — front side, flat surface, good lighting. Drag-and-drop or tap to upload.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
    glow: 'rgba(99,102,241,0.15)',
  },
  {
    step: '02',
    icon: Crosshair,
    title: 'Align the Border Guides',
    desc: 'Drag the four corner handles to perfectly match your card\'s edges. A built-in level indicator ensures straight alignment.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    glow: 'rgba(139,92,246,0.15)',
  },
  {
    step: '03',
    icon: Sparkles,
    title: 'Get Your Grade Estimates',
    desc: 'Hit Analyze and get instant estimates for PSA, BGS, CGC, and SGC — based on centering, surface, edges, and corners.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    glow: 'rgba(34,211,238,0.15)',
  },
]

const GRADE_TIERS = [
  {
    grade: '10',
    label: 'Gem Mint',
    desc: 'Near-perfect card. Essentially flawless in every way.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/25',
    dot: 'bg-yellow-400',
  },
  {
    grade: '9',
    label: 'Mint',
    desc: 'Only the slightest imperfections visible under close inspection.',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/25',
    dot: 'bg-green-400',
  },
  {
    grade: '8',
    label: 'NM-MT',
    desc: 'Slight surface wear visible under close inspection. Sharp corners.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/25',
    dot: 'bg-blue-400',
  },
  {
    grade: '7',
    label: 'Near Mint',
    desc: 'Light play wear, minor edge wear. Still a strong card.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/25',
    dot: 'bg-cyan-400',
  },
  {
    grade: '<7',
    label: 'Below NM',
    desc: 'Visible wear, damage, creases, or heavy play use.',
    color: 'text-muted-foreground',
    bg: 'bg-secondary/50',
    border: 'border-border',
    dot: 'bg-muted-foreground',
  },
]

const FEATURES = [
  {
    icon: Crosshair,
    title: 'Mathematical Precision',
    desc: 'Centering calculated to pixel-level accuracy using Sobel edge detection and sub-pixel border measurement.',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    icon: Star,
    title: 'Four Grading Standards',
    desc: 'PSA, BGS, CGC, and SGC estimates in a single analysis — each calibrated with company-specific weight profiles.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Clock,
    title: 'Instant Results',
    desc: 'Full pipeline analysis — centering, surface, edges, and corners — completes in under a second.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Shield,
    title: '100% Private',
    desc: 'Every computation runs locally in your browser. Your photos never leave your device — ever.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Globe,
    title: 'Works Anywhere',
    desc: 'No installation. No account. No plugins. Open a browser, upload a card, get your grade.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: Zap,
    title: 'Free Forever',
    desc: 'No subscriptions, no paywalls, no usage limits. Grade as many cards as you want.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
]

const GRADE_PREVIEW = [
  { company: 'PSA', grade: '9', label: 'Mint', color: 'text-green-400', ring: 'ring-green-400/30' },
  { company: 'BGS', grade: '9.5', label: 'Gem Mint', color: 'text-yellow-400', ring: 'ring-yellow-400/30' },
  { company: 'CGC', grade: '9', label: 'Mint', color: 'text-blue-400', ring: 'ring-blue-400/30' },
  { company: 'SGC', grade: '9', label: 'Mint+', color: 'text-cyan-400', ring: 'ring-cyan-400/30' },
]

// ─── Section wrapper with InView trigger ──────────────────────────────────

function AnimatedSection({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode
  className?: string
  id?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.section
      id={id}
      ref={ref}
      variants={stagger}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.section>
  )
}

// ─── Hero mockup card ─────────────────────────────────────────────────────

function GradeResultMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto mt-14 select-none">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-indigo-500/20 via-violet-500/10 to-transparent blur-2xl -z-10 scale-105" />

      {/* Card shell */}
      <div className="rounded-2xl border border-border bg-card surface-highlight overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground">Analysis Complete</span>
          </div>
          <Badge variant="success" className="text-xs">
            Centering 94%
          </Badge>
        </div>

        {/* Fake card image placeholder */}
        <div className="relative h-32 bg-secondary/40 flex items-center justify-center overflow-hidden">
          {/* Grid overlay simulation */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(99,102,241,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.4) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          {/* Corner guides */}
          <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-indigo-400/80 rounded-tl" />
          <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-indigo-400/80 rounded-tr" />
          <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-indigo-400/80 rounded-bl" />
          <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-indigo-400/80 rounded-br" />
          {/* Centering lines */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-indigo-400/50" />
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-indigo-400/50" />
          <div className="text-xs text-muted-foreground font-mono">Card Preview</div>
        </div>

        {/* Grade pills */}
        <div className="grid grid-cols-4 gap-2 p-4">
          {GRADE_PREVIEW.map((g) => (
            <div
              key={g.company}
              className={`rounded-xl border bg-secondary/30 p-3 text-center ring-1 ${g.ring} surface-highlight`}
            >
              <div className="text-xs text-muted-foreground mb-1 font-medium">{g.company}</div>
              <div className={`text-xl font-black tabular ${g.color}`}>{g.grade}</div>
              <div className="text-xs text-muted-foreground mt-0.5 truncate">{g.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bars */}
        <div className="px-4 pb-4 space-y-2">
          {[
            { label: 'Centering', value: 94, color: 'bg-indigo-500' },
            { label: 'Surface', value: 91, color: 'bg-emerald-500' },
            { label: 'Edges', value: 88, color: 'bg-violet-500' },
            { label: 'Corners', value: 92, color: 'bg-cyan-500' },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-16 shrink-0">{bar.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${bar.color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${bar.value}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground w-8 text-right">{bar.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  // The global body style sets overflow:hidden for the app shell.
  // The landing page needs normal scrolling, so we override locally.
  useEffect(() => {
    const prev = document.body.style.overflow
    const prevH = document.body.style.height
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    return () => {
      document.body.style.overflow = prev
      document.body.style.height = prevH
    }
  }, [])

  const scrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center glow-primary shrink-0">
              <ScanLine className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm">CardGrade Studio</span>
            <Badge variant="outline" className="text-xs border-border text-muted-foreground hidden sm:inline-flex">
              v1.0.1
            </Badge>
          </div>

          {/* CTA */}
          <Link href="/analyze">
            <Button size="sm" className="gap-1.5 glow-primary">
              Grade a Card
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-14 overflow-hidden">
          {/* Grid background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Radial gradient overlays */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
            <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] rounded-full bg-violet-500/8 blur-[80px]" />
            <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-background to-transparent" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-xs text-muted-foreground mb-8"
            >
              <Zap className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              Mathematical Precision Grading
            </motion.div>

            {/* H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6"
            >
              <span className="text-foreground">Grade Your Cards</span>
              <br />
              <span className="text-gradient">Like a Pro</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Instant PSA, BGS, CGC &amp; SGC grade estimates. Upload your card,
              align the guides, get your grade — no account, no cost, no compromise.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.22 }}
              className="flex items-center justify-center gap-3 flex-wrap mb-8"
            >
              <Link href="/analyze">
                <Button size="lg" className="gap-2 glow-primary px-8 text-base font-semibold">
                  Start Grading — Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base"
                onClick={scrollToHowItWorks}
              >
                See how it works ↓
              </Button>
            </motion.div>

            {/* Social proof */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="text-sm text-muted-foreground"
            >
              Used by serious collectors worldwide
            </motion.p>

            {/* Hero mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <GradeResultMockup />
            </motion.div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <AnimatedSection id="how-it-works" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                The Process
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Three Steps to Your Grade
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                From photo to professional-grade estimate in under a minute.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {HOW_IT_WORKS.map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.div
                    key={item.title}
                    variants={fadeInUp}
                    className={`relative rounded-2xl border ${item.border} bg-card surface-highlight p-6 overflow-hidden`}
                  >
                    {/* Subtle step glow */}
                    <div
                      className="absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl opacity-60 -z-0"
                      style={{ background: item.glow }}
                    />
                    <div className="relative z-10">
                      {/* Step number */}
                      <div className="flex items-center gap-3 mb-5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color} border ${item.border} shrink-0`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-mono font-bold text-muted-foreground tracking-wider">
                          STEP {item.step}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </AnimatedSection>

        {/* ── GRADE SCALE ── */}
        <AnimatedSection className="py-24 px-6 bg-secondary/20">
          <div className="max-w-5xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                Grade Reference
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                What Do The Numbers Mean?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Professional grading companies all use a 1–10 scale. Here&apos;s what each tier represents.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {GRADE_TIERS.map((tier) => (
                <motion.div
                  key={tier.grade}
                  variants={fadeInUp}
                  className={`rounded-2xl border ${tier.border} ${tier.bg} surface-highlight p-5 flex flex-col gap-3`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${tier.dot}`} />
                    <span className={`text-2xl font-black tabular ${tier.color}`}>{tier.grade}</span>
                  </div>
                  <div>
                    <p className={`text-sm font-bold mb-1 ${tier.color}`}>{tier.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tier.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>

        {/* ── FEATURES GRID ── */}
        <AnimatedSection className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
                Capabilities
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Built for Serious Collectors
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every feature is engineered for accuracy, privacy, and speed.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map((f) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.title}
                    variants={fadeInUp}
                    className={`rounded-2xl border ${f.border} bg-card surface-highlight p-6`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.bg} ${f.color} border ${f.border}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </AnimatedSection>

        {/* ── CTA SECTION ── */}
        <AnimatedSection className="py-24 px-6">
          <motion.div variants={fadeInUp} className="max-w-2xl mx-auto">
            <div className="relative rounded-3xl overflow-hidden border border-border surface-highlight">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-violet-500/8 to-background pointer-events-none" />
              {/* Grid overlay */}
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
              {/* Top edge glow */}
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

              <div className="relative px-8 py-14 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary/60 text-xs text-muted-foreground mb-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Ready when you are
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Ready to Grade Your Cards?
                </h2>
                <p className="text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
                  Join collectors who grade smarter. No sign-up. No credit card.
                  Just upload and grade.
                </p>
                <Link href="/analyze">
                  <Button size="lg" className="gap-2 glow-primary px-10 text-base font-semibold">
                    <ScanLine className="w-4 h-4" />
                    Grade Your First Card — It&apos;s Free
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatedSection>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary/80 flex items-center justify-center">
              <ScanLine className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">CardGrade Studio</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Free card grading tool &middot; Made with precision
          </p>
          <p className="text-xs text-muted-foreground">v1.0.1</p>
        </div>
      </footer>
    </div>
  )
}
