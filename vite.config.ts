import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages hosts this project under /Stickerz/.
  base: '/Stickerz/',
  plugins: [react()],
  build: { rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } } },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: true },
});
