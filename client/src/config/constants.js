export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const LIMITS = {
  MAX_FILE_SIZE_MB: 500,
  MAX_FILES: 20,
  CODE_LENGTH: 6,
  CODES_COUNT: 3
};
