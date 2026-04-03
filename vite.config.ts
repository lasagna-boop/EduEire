/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Scope to modules exercised by the test suite so the report reflects
      // "coverage of tested logic", not the entire app (pages untested stay 0% otherwise).
      include: [
        'src/App.tsx',
        'src/lib/voteScoreDelta.ts',
        'src/lib/commentTree.ts',
        'src/lib/threadPostMap.ts',
        'src/lib/communityLocations.ts',
        'src/lib/moderationSpam.ts',
        'src/hooks/useFlashCountdown.ts',
        'functions/src/credibility.ts',
      ],
    },
  },
})
