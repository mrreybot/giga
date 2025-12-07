import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ EN ÖNEMLİ KISIM: base: ''
export default defineConfig({
  base: '',
  plugins: [react()],
})
