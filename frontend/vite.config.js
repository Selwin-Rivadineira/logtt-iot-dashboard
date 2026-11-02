import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { assertPublicEnvironment } from './src/services/supabaseKey.js';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  assertPublicEnvironment(loadEnv(mode, process.cwd(), 'VITE_'));
  return { plugins: [react()] };
});
