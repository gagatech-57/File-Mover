import fs from 'fs';
import path from 'path';
import sanitize from 'sanitize-filename';
import { config } from '../config/env.js';

/**
 * Ensure directory exists
 */
export function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get directory path for a specific session's uploads
 */
export function getSessionUploadDir(sessionId) {
  const safeId = sanitize(sessionId);
  const dir = path.resolve(config.UPLOADS_DIR, safeId);
  ensureDirExists(dir);
  return dir;
}

/**
 * Delete a session directory and all its uploaded temporary files
 */
export function deleteSessionUploadDir(sessionId) {
  try {
    const safeId = sanitize(sessionId);
    const dir = path.resolve(config.UPLOADS_DIR, safeId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Error deleting session directory for ${sessionId}:`, err);
  }
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFileName(name) {
  const clean = sanitize(name);
  return clean.length > 0 ? clean : 'unnamed_file';
}

/**
 * Format bytes into human readable format
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
