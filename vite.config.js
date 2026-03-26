import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // ZMIEŃ na nazwę swojego repozytorium GitHub, np. '/sempai-ai-visibility/'
  base: '/Sempai-AI-Visibility-Generator/',
})
