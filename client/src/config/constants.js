const RENDER_BACKEND = 'https://file-mover-mkqr.onrender.com';

function getApiBaseUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('vercel.app')) {
      return `${RENDER_BACKEND}/api`;
    }
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
}

function getSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('vercel.app')) {
      return RENDER_BACKEND;
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
}

export const API_BASE_URL = getApiBaseUrl();
export const SOCKET_URL = getSocketUrl();

export const LIMITS = {
  MAX_FILE_SIZE_MB: 500,
  MAX_FILES: 20,
  CODE_LENGTH: 6,
  CODES_COUNT: 3
};
