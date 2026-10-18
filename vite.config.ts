import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages hosts this project under /Stickerz/.
  base: '/Stickerz/',
  plugins: [react()],
  build: { rollupOptions: { input: { main: 'index.html', admin: 'admin.html' } } },
});
