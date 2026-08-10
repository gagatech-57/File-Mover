import { sessionStore } from '../services/sessionStore.js';

/**
 * Express middleware to validate active session existence
 */
export async function validateActiveSession(req, res, next) {
  try {
    const sessionId = req.params.sessionId || req.body.sessionId || req.query.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const session = await sessionStore.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found or has expired'
      });
    }

    // Attach verified session to request object
    req.session = session;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to validate session: ' + err.message
    });
  }
}

/**
 * Validate session auth token for file upload/download actions
 */
export function validateSessionAuthToken(req, res, next) {
  const session = req.session;
  const authToken = req.headers['x-session-token'] || req.query.token;

  if (!session) {
    return res.status(404).json({
      success: false,
      message: 'Session context missing'
    });
  }

  if (!authToken || authToken !== session.authToken) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized session token'
    });
  }

  next();
}
