import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Sempai-AI-Visibility-Generator/',
  esbuild: {
    target: 'es2020',
  },
})
