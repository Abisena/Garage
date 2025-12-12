import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Tambah ini agar bisa diakses dari luar
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8002',  // Ubah dari 8008 ke 8002
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
})
