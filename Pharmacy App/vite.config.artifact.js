import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Produces one self-contained HTML file (JS, CSS, fonts, and the sql.js
// WASM binary all inlined) for hosting as a Claude Artifact preview. Not
// used for the real app — see vite.config.js for that.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 2 * 1024 * 1024,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'index.artifact.html',
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
