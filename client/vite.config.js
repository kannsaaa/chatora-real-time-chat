import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Copies dist/index.html to dist/404.html so static hosts like Render Static Sites
 * fallback to the Single Page Application router when deep links (e.g. /users/:id/verify/:token) are loaded.
 */
function spaFallbackPlugin() {
  return {
    name: 'spa-fallback',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      const distIndex = path.resolve(distDir, 'index.html')
      const dist404 = path.resolve(distDir, '404.html')
      try {
        if (fs.existsSync(distIndex)) {
          fs.copyFileSync(distIndex, dist404)
          console.log('[spa-fallback] Copied dist/index.html -> dist/404.html for Render static site SPA routing.')
        }
      } catch (err) {
        console.warn('[spa-fallback] Warning copying 404.html fallback:', err.message)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallbackPlugin()],
})
