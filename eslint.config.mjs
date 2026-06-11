import nextConfig from 'eslint-config-next'

export default [
  ...nextConfig,
  {
    // next/image optimization requires a server; this is a static export app.
    // Custom fonts in layout.tsx is correct for App Router.
    rules: {
      '@next/next/no-img-element': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'node_modules/**'],
  },
]
