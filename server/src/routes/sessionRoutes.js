import express from 'express';
import {
  createSession,
  verifySession,
  getSessionStatus,
  regenerateQR,
  closeSession
} from '../controllers/sessionController.js';
import { validateActiveSession } from '../middleware/validateSession.js';
import { createSessionLimiter, verificationLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Create new temporary sharing session
router.post('/create', createSessionLimiter, createSession);

// Verify codes or QR token
router.post('/verify', verificationLimiter, verifySession);

// Get active session status
router.get('/:sessionId/status', validateActiveSession, getSessionStatus);

// Regenerate QR token for session
router.post('/:sessionId/regenerate-qr', validateActiveSession, regenerateQR);

// Close/destroy session manually
router.post('/:sessionId/close', validateActiveSession, closeSession);

export default router;
