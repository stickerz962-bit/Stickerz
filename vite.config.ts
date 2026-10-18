import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages hosts this project under /Stickerz/.
  base: '/Stickerz/',
  plugins: [react()],
  build: { rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } } },
  // Vitest adds this field to Vite's config type.
  // @ts-expect-error Vitest config extension is consumed by Vitest, not Vite.
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: true },
});
