export const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5000/api');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

export const LIMITS = {
  MAX_FILE_SIZE_MB: 500,
  MAX_FILES: 20,
  CODE_LENGTH: 6,
  CODES_COUNT: 3
};
