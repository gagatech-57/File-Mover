import { sessionStore } from '../services/sessionStore.js';
import { config } from '../config/env.js';

/**
 * POST /api/sessions/create
 */
export async function createSession(req, res) {
  try {
    const { expirationMinutes } = req.body;
    const customExpiration = expirationMinutes && !isNaN(expirationMinutes)
      ? Math.min(Math.max(parseInt(expirationMinutes, 10), 5), 60)
      : config.SESSION_EXPIRATION_MINUTES;

    const session = await sessionStore.createSession(customExpiration);

    return res.status(201).json({
      success: true,
      sessionId: session.sessionId,
      codes: session.codes,
      qrToken: session.qrToken,
      authToken: session.authToken,
      expiresAt: session.expiresAt,
      limits: {
        maxFileSize: config.MAX_FILE_SIZE_BYTES,
        maxFiles: config.MAX_FILES_PER_SESSION,
        maxTotalSize: config.MAX_TOTAL_SESSION_SIZE_BYTES,
        expirationMinutes: customExpiration
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/sessions/verify
 */
export async function verifySession(req, res) {
  try {
    const { codes, qrToken } = req.body;

    let verificationResult;

    if (qrToken) {
      verificationResult = await sessionStore.verifyByQRToken(qrToken);
    } else if (Array.isArray(codes)) {
      verificationResult = await sessionStore.verifyByCodes(codes);
    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either 3 verification codes or a QR token'
      });
    }

    if (!verificationResult.success) {
      return res.status(400).json({
        success: false,
        message: verificationResult.reason || 'Verification failed'
      });
    }

    const { session } = verificationResult;
    const safeFiles = Array.isArray(session.files) ? session.files : [];

    return res.json({
      success: true,
      sessionId: session.sessionId,
      authToken: session.authToken,
      expiresAt: session.expiresAt,
      status: session.status,
      filesCount: safeFiles.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * GET /api/sessions/:sessionId/status
 */
export async function getSessionStatus(req, res) {
  try {
    const session = req.session;
    const safeFiles = Array.isArray(session.files) ? session.files : [];

    return res.json({
      success: true,
      sessionId: session.sessionId,
      status: session.status,
      senderConnected: session.senderConnected,
      receiverConnected: session.receiverConnected,
      expiresAt: session.expiresAt,
      files: safeFiles.map(f => ({
        id: f.id,
        originalName: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        completed: f.completed
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/sessions/:sessionId/regenerate-qr
 */
export async function regenerateQR(req, res) {
  try {
    const session = req.session;
    const newQRToken = await sessionStore.regenerateQRToken(session.sessionId);

    if (!newQRToken) {
      return res.status(400).json({
        success: false,
        message: 'Failed to regenerate QR token'
      });
    }

    return res.json({
      success: true,
      qrToken: newQRToken
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

/**
 * POST /api/sessions/:sessionId/close
 */
export async function closeSession(req, res) {
  try {
    const session = req.session;
    await sessionStore.deleteSession(session.sessionId);

    return res.json({
      success: true,
      message: 'Session closed and temporary data deleted.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
