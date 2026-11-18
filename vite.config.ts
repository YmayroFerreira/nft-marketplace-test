import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * main.tsx loads the mock API and then the app, one after the other. Preloading
 * both chunks and everything they import downloads them in parallel, instead of
 * discovering them one level at a time; they still run in order.
 */
function preloadStartupChunks(): Plugin {
  return {
    name: 'preload-startup-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle ?? {}
        const files = new Set<string>()
        const visit = (fileName: string) => {
          const chunk = bundle[fileName]
          if (chunk?.type !== 'chunk' || files.has(fileName)) return
          files.add(fileName)
          chunk.imports.forEach(visit)
        }
        for (const file of Object.values(bundle)) {
          if (file.type === 'chunk' && file.isDynamicEntry && ['browser', 'app'].includes(file.name)) visit(file.fileName)
        }
        return [...files]
          .filter((fileName) => !html.includes(fileName))
          .map((fileName) => ({
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `/${fileName}` },
            injectTo: 'head' as const,
          }))
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // Must come before react(): generates src/routeTree.gen.ts from src/routes
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadStartupChunks(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      tldts: fileURLToPath(new URL('./src/mocks/shims/tldts.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
