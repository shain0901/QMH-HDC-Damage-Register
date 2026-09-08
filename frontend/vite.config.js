import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev only — in production the built frontend and the API live behind the same
// Vercel domain, so no proxy/CORS is needed there. When running `npm run dev` locally,
// this forwards /api calls to `vercel dev` (or a locally-running FastAPI) on port 8000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
