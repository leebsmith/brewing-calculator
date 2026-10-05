// vite.config.js
import { defineConfig } from 'vite';
import injectHTML from 'vite-plugin-html-inject';

export default defineConfig({
  root: './frontend',
  server: {
    port: 5173,
    open: false
  },
  plugins: [injectHTML()]
});