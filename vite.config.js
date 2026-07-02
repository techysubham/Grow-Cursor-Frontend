import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-mui': [
            '@mui/material', '@mui/icons-material',
            '@mui/x-data-grid', '@mui/x-date-pickers',
            '@emotion/react', '@emotion/styled'
          ],
          'vendor-charts': ['recharts'],
          'vendor-router': ['react-router-dom'],
        }
      }
    }
  }
});

