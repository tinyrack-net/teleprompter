import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // vendor (React + Base UI + router) is ~150 kB gzip and cached separately.
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Third-party code changes rarely; a separate chunk stays cached across deploys.
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules/ }],
        },
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
