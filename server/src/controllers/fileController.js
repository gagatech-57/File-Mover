import fs from 'fs';
import path from 'path';
import multer from 'multer';
import archiver from 'archiver';
import { config } from '../config/env.js';
import { sessionStore } from '../services/sessionStore.js';
import { getSessionUploadDir, sanitizeFileName } from '../utils/fileUtils.js';

// Configure Multer storage to stream direct to temp session folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.params.sessionId;
    const sessionDir = getSessionUploadDir(sessionId);
    cb(null, sessionDir);
  },
  filename: (req, file, cb) => {
    const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    cb(null, fileId);
  }
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE_BYTES
  }
}).array('files', config.MAX_FILES_PER_SESSION);

/**
 * POST /api/sessions/:sessionId/upload
 */
export async function uploadFiles(req, res) {
  try {
    const session = req.session;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files were attached to the upload request.'
      });
    }

    const safeFiles = Array.isArray(session.files) ? session.files : [];

    // Calculate total existing + new file size
    const existingSize = safeFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const newSize = req.files.reduce((acc, f) => acc + f.size, 0);

    if (existingSize + newSize > config.MAX_TOTAL_SESSION_SIZE_BYTES) {
      req.files.forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });
      return res.status(400).json({
        success: false,
        message: `Total session upload size limit exceeded (${config.MAX_TOTAL_SESSION_SIZE_BYTES / (1024 * 1024)} MB max)`
      });
    }

    const uploadedRecords = [];

    for (const f of req.files) {
      const safeName = sanitizeFileName(f.originalname);
      const fileMeta = {
        id: f.filename,
        originalName: safeName,
        mimeType: f.mimetype || 'application/octet-stream',
        size: f.size,
        tempPath: f.path,
        uploadedBytes: f.size,
        completed: true,
        createdAt: Date.now()
      };

      await sessionStore.addFile(session.sessionId, fileMeta);
      uploadedRecords.push({
        id: fileMeta.id,
        originalName: fileMeta.originalName,
        mimeType: fileMeta.mimeType,
        size: fileMeta.size
      });
    }

    session.status = 'COMPLETED';

    const updatedSession = await sessionStore.getSession(session.sessionId);
    const allFiles = (updatedSession && updatedSession.files ? updatedSession.files : []).map(f => ({
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size
    }));

    return res.json({
      success: true,
      message: `${uploadedRecords.length} file(s) uploaded successfully`,
      newFiles: uploadedRecords,
      files: allFiles
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/sessions/:sessionId/files
 */
export function listSessionFiles(req, res) {
  const session = req.session;
  const safeFiles = Array.isArray(session.files) ? session.files : [];

  const fileList = safeFiles.map(f => ({
    id: f.id,
    originalName: f.originalName,
    mimeType: f.mimeType,
    size: f.size,
    completed: f.completed
  }));

  return res.json({
    success: true,
    files: fileList
  });
}

/**
 * GET /api/sessions/:sessionId/download/:fileId
 */
export function downloadFile(req, res) {
  const session = req.session;
  const { fileId } = req.params;
  const safeFiles = Array.isArray(session.files) ? session.files : [];

  const fileMeta = safeFiles.find(f => f.id === fileId);

  if (!fileMeta) {
    return res.status(404).json({
      success: false,
      message: 'Requested file not found in session'
    });
  }

  if (!fs.existsSync(fileMeta.tempPath)) {
    return res.status(404).json({
      success: false,
      message: 'File missing from storage'
    });
  }

  res.setHeader('Content-Type', fileMeta.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName)}"`);
  res.setHeader('Content-Length', fileMeta.size);

  const readStream = fs.createReadStream(fileMeta.tempPath);
  readStream.pipe(res);
}

/**
 * GET /api/sessions/:sessionId/download-all
 */
export function downloadAllZip(req, res) {
  const session = req.session;
  const safeFiles = Array.isArray(session.files) ? session.files : [];

  if (safeFiles.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files available for download'
    });
  }

  const archive = archiver('zip', {
    zlib: { level: 6 }
  });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="FileShare_${session.sessionId.substring(5, 11)}.zip"`);

  archive.on('error', (err) => {
    console.error('[Archive Error]', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'ZIP archive creation failed' });
    }
  });

  archive.pipe(res);

  for (const fileMeta of safeFiles) {
    if (fs.existsSync(fileMeta.tempPath)) {
      archive.file(fileMeta.tempPath, { name: fileMeta.originalName });
    }
  }

  archive.finalize();
}
