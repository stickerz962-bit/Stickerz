import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages hosts this project under /Stickerz/.
  base: '/Stickerz/',
  plugins: [react()],
  build: { rollupOptions: { input: { main: 'index.html', admin: 'admin.html', adminAmbassadors: 'admin-ambassadors.html', partnerRetired: 'partner.html', partnerDashboardRetired: 'partner-dashboard.html', adminPartnersRetired: 'admin-partners.html' } } },
});
