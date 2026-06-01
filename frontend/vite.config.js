import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite configuration for Mei Arivu frontend.
 *
 * LOCAL DEV  : the /api proxy forwards requests to the local FastAPI server.
 * PRODUCTION : VITE_API_BASE_URL is set in Vercel env vars to the Render
 *              backend URL, so all fetch() calls use the absolute URL from
 *              src/config/api.js — no proxy is involved in production.
 */
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        // Dev-only proxy — ignored in production builds
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            }
        }
    }
})

