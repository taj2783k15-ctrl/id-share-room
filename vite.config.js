import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        rescue: resolve(projectRoot, 'index.html'),
        system: resolve(projectRoot, 'system.html'),
        expansion: resolve(projectRoot, 'expansion.html'),
      },
    },
  },
})
