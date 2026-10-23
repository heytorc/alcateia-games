import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const base = '/alcateia-games/'
// URL pública do site (links de og:/twitter: precisam ser absolutos). O deploy define VITE_SITE_URL.
const siteUrl = process.env.VITE_SITE_URL ?? `https://heytorc.github.io${base}`

export default defineConfig({
  base,
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  },
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl)
    },
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,gif}'],
        globIgnores: ['og-image.png']
      },
      manifest: {
        name: 'Alcateia Games',
        short_name: 'Alcateia',
        description: 'Jogos rápidos para animar qualquer turma.',
        lang: 'pt-BR',
        categories: ['games', 'entertainment'],
        theme_color: '#151329',
        background_color: '#151329',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
