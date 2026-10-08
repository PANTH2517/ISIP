import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Frontend unit/component tests (run with `npm test`). Separate from vite.config.js so tests skip Tailwind.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
})
