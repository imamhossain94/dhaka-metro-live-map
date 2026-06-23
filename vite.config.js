import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/  — Vercel auto-detects this as a "Vite" project.
export default defineConfig({
  plugins: [react()],
});
