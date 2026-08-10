import express from 'express';
import {
  uploadMiddleware,
  uploadFiles,
  listSessionFiles,
  downloadFile,
  downloadAllZip
} from '../controllers/fileController.js';
import { validateActiveSession, validateSessionAuthToken } from '../middleware/validateSession.js';

const router = express.Router({ mergeParams: true });

// Upload files to session
router.post(
  '/:sessionId/upload',
  validateActiveSession,
  validateSessionAuthToken,
  uploadMiddleware,
  uploadFiles
);

// List files in session
router.get(
  '/:sessionId/files',
  validateActiveSession,
  listSessionFiles
);

// Download single file
router.get(
  '/:sessionId/download/:fileId',
  validateActiveSession,
  downloadFile
);

// Download all files as ZIP
router.get(
  '/:sessionId/download-all',
  validateActiveSession,
  downloadAllZip
);

export default router;
