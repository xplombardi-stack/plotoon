import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// base './' deixa os arquivos com caminho relativo: funciona na prévia e na Vercel
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
