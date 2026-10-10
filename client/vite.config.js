import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Shown as "Last updated" in the footer; set when the dev server starts or the app is built.
  define: { __BUILD_DATE__: JSON.stringify(new Date().toLocaleDateString('en-CA')) }, // local YYYY-MM-DD
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5000' },
  },
})
