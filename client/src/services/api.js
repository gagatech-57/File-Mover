import { API_BASE_URL } from '../config/constants.js';

export const api = {
  /**
   * Create a new temporary sharing session
   */
  async createSession(expirationMinutes = 20) {
    const res = await fetch(`${API_BASE_URL}/sessions/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expirationMinutes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create session');
    return data;
  },

  /**
   * Verify codes or QR token
   */
  async verifySession(payload) {
    const res = await fetch(`${API_BASE_URL}/sessions/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');
    return data;
  },

  /**
   * Fetch active session status
   */
  async getSessionStatus(sessionId) {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/status`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Session status unavailable');
    return data;
  },

  /**
   * Fetch session file list
   */
  async getSessionFiles(sessionId) {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/files`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch session files');
    return data;
  },

  /**
   * Regenerate QR token
   */
  async regenerateQR(sessionId) {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/regenerate-qr`, {
      method: 'POST'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to regenerate QR token');
    return data;
  },

  /**
   * Close session
   */
  async closeSession(sessionId) {
    const res = await fetch(`${API_BASE_URL}/sessions/${sessionId}/close`, {
      method: 'POST'
    });
    return await res.json();
  },

  /**
   * Upload files with progress tracking
   */
  uploadFiles(sessionId, authToken, files, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/sessions/${sessionId}/upload`);

      xhr.setRequestHeader('x-session-token', authToken);

      // Track progress
      if (xhr.upload && onProgress) {
        let startTime = Date.now();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            const elapsedTime = (Date.now() - startTime) / 1000;
            const speed = elapsedTime > 0 ? (e.loaded / elapsedTime) : 0; // Bytes / sec
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percent,
              speed
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            resolve(resp);
          } catch (err) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const resp = JSON.parse(xhr.responseText);
            reject(new Error(resp.message || 'Upload failed'));
          } catch (err) {
            reject(new Error(`Upload failed with HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });
  },

  /**
   * Helper URL formatters for downloads
   */
  getDownloadSingleUrl(sessionId, fileId) {
    return `${API_BASE_URL}/sessions/${sessionId}/download/${fileId}`;
  },

  getDownloadAllZipUrl(sessionId) {
    return `${API_BASE_URL}/sessions/${sessionId}/download-all`;
  }
};
