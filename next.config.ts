import type { NextConfig } from 'next'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read VERSION file at build time and inject as public env var.
// Falls back to 'dev' so local `npm run dev` always works.
let APP_VERSION = 'dev'
try {
  APP_VERSION = readFileSync(join(process.cwd(), 'VERSION'), 'utf-8').trim()
} catch {
  // VERSION file missing is fine in CI bootstrap
}

// GitHub Pages base path: /REPO_NAME (injected by workflow)
// Empty string = local dev / custom domain
const repoName = process.env.NEXT_PUBLIC_REPO_NAME ?? ''
const basePath = repoName ? `/${repoName}` : ''

const nextConfig: NextConfig = {
  // Static export — 100% frontend, no server needed
  output: 'export',

  // GitHub Pages sub-path routing
  basePath,
  assetPrefix: basePath ? `${basePath}/` : '',

  // Required for static export routing on GitHub Pages
  trailingSlash: true,

  // Next.js Image Optimization needs a server — disable for static export
  images: {
    unoptimized: true,
  },

  // Inject version so every client component can read process.env.NEXT_PUBLIC_APP_VERSION
  env: {
    NEXT_PUBLIC_APP_VERSION:
      process.env.NEXT_PUBLIC_APP_VERSION ?? APP_VERSION,
  },

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}

export default nextConfig
