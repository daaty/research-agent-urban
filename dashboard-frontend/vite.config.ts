import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3040',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3040',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
})
