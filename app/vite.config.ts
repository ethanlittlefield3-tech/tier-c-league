import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

// `base: './'` keeps every path relative, so the same build works on GitHub
// Pages (served from /tier-c-league/) and from the local dev server.
export default defineConfig({
  base: './',
  plugins: [preact()],
  server: { port: 5173 },
});
