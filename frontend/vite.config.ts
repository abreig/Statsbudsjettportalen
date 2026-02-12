import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Bind 0.0.0.0 – required for Codespaces port forwarding
    port: 5173,
    allowedHosts: 'all', // Allow any forwarded host (Codespaces, Gitpod, etc.)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
