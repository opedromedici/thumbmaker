/**
 * vite.config.local.js — cópia que vai para C:\gerador-thumb-dev\frontend\
 *
 * node_modules: instalado localmente (fora do Google Drive)
 * root (source): continua no Google Drive
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOCAL_MODULES = path.join(__dirname, 'node_modules')
const SOURCE_ROOT = 'G:/Meu Drive/PROJETOS DE IA (Claude Code + Cursor + Antigravity)/Gerador de Thumb/frontend'

export default defineConfig({
  plugins: [react()],
  root: SOURCE_ROOT,
  resolve: {
    modules: [LOCAL_MODULES, 'node_modules'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api':     { target: 'http://localhost:8000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'fabric'],
  },
  cacheDir: path.join(__dirname, '.vite'),
})
