/**
 * src/config/api.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized API configuration for the Mei Arivu frontend.
 *
 * In production (Vercel), VITE_API_BASE_URL points to the Render backend.
 * In local development, the Vite dev-server proxy handles /api/* so
 * API_BASE_URL can be left as an empty string ('' = same origin).
 *
 * Usage:
 *   import { API_BASE_URL } from '../config/api';
 *   const res = await fetch(`${API_BASE_URL}/api/sites`);
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export default API_BASE_URL;
