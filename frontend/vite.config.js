import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // Locks Vite to the current directory (frontend)
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});