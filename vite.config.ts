import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'



// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // For GitHub Pages: set base to your repo name
  base: process.env.GITHUB_PAGES === 'true' ? '/MiniLathe-GearCalc/' : "",
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        combinations: resolve(__dirname, 'src/workers/combinations.ts'),
        recalculation: resolve(__dirname, 'src/workers/recalculation.ts')
      },
      output: {
        entryFileNames(chunkInfo) {
          // Worker files go to root with simple names
          if (chunkInfo.name === 'combinations' || chunkInfo.name === 'recalculation') {
            return '[name].js';
          }
          // Main app entry also goes to root as index.js
          if (chunkInfo.name === 'main') {
            return 'index.js';
          }
          // Everything else gets hashed in assets folder
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    exclude: ['**/node_modules/**', '**/dist/**', '**/playwright/**', '**/*.spec.ts'],
  }
})
