import crypto from 'crypto';
import { config } from '../config/env.js';

/**
 * Generate a single cryptographically secure 6-digit numeric code
 * Range: 100000 to 999999
 */
export function generateSingleCode() {
  const min = Math.pow(10, config.CODE_LENGTH - 1); // 100000
  const max = Math.pow(10, config.CODE_LENGTH) - 1; // 999999
  const randomInt = crypto.randomInt(min, max + 1);
  return randomInt.toString();
}

/**
 * Generate 3 distinct 6-digit numeric codes
 */
export function generateSessionCodes(count = config.CODES_PER_SESSION) {
  const codes = new Set();
  while (codes.size < count) {
    codes.add(generateSingleCode());
  }
  return Array.from(codes);
}

/**
 * Generate a cryptographically secure random session ID
 */
export function generateSessionId() {
  return 'sess_' + crypto.randomBytes(12).toString('hex');
}

/**
 * Generate a secure random QR token
 */
export function generateQRToken() {
  return 'qrt_' + crypto.randomBytes(16).toString('hex');
}

/**
 * Generate a secure random authorization token for the session connection
 */
export function generateAuthToken() {
  return 'token_' + crypto.randomBytes(24).toString('hex');
}

/**
 * Timing-safe comparison to prevent timing side-channel attacks on verification
 */
export function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
