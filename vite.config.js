import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En producción (GitHub Pages) la app vive en /vitucakes/. En dev servimos
// desde la raíz para simplificar la verificación local.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/vitucakes/' : '/',
}))
