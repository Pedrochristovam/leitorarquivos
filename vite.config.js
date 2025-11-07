import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Permite acesso da rede local
    proxy: {
      '/upload': {
        target: 'http://localhost:8010',
        changeOrigin: true
      },
      '/health': {
        target: 'http://localhost:8010',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
