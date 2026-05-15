import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        features: resolve(__dirname, 'features.html'),
        agents: resolve(__dirname, 'agents.html'),
        stack: resolve(__dirname, 'stack.html'),
        usecases: resolve(__dirname, 'usecases.html'),
        download: resolve(__dirname, 'download.html'),
        docs: resolve(__dirname, 'docs.html'),
      }
    }
  }
})
