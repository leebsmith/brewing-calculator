// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  root: './frontend',
  server: {
    port: 5173,
    open: false // Prevents Vite from trying to spawn the browser directly
  }
});
