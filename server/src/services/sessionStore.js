import { config } from '../config/env.js';
import {
  generateSessionId,
  generateSessionCodes,
  generateQRToken,
  generateAuthToken,
  timingSafeCompare
} from '../utils/codeGenerator.js';
import { deleteSessionUploadDir } from '../utils/fileUtils.js';
import { SessionModel } from '../models/Session.js';

class SessionStore {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Create a new temporary sharing session
   */
  async createSession(expirationMinutes = config.SESSION_EXPIRATION_MINUTES) {
    const sessionId = generateSessionId();
    const codes = generateSessionCodes(config.CODES_PER_SESSION);
    const qrToken = generateQRToken();
    const now = Date.now();
    const expiresAt = new Date(now + expirationMinutes * 60 * 1000);

    const sessionData = {
      sessionId,
      codes,
      qrToken,
      authToken: generateAuthToken(),
      status: 'WAITING',
      senderConnected: false,
      receiverConnected: false,
      senderSocketId: null,
      receiverSocketId: null,
      files: [],
      failedAttempts: 0,
      createdAt: new Date(now),
      expiresAt,
    };

    // Store in-memory
    this.sessions.set(sessionId, sessionData);

    // Persist to MongoDB Atlas asynchronously
    try {
      if (SessionModel.db.readyState === 1) {
        await SessionModel.create(sessionData);
      }
    } catch (err) {
      console.error('[SessionStore] MongoDB save error:', err.message);
    }

    return sessionData;
  }

  /**
   * Retrieve a session by ID
   */
  async getSession(sessionId) {
    if (!sessionId) return null;

    // Check memory first
    let session = this.sessions.get(sessionId);

    // Fallback to MongoDB if not in memory
    if (!session && SessionModel.db.readyState === 1) {
      try {
        const doc = await SessionModel.findOne({ sessionId });
        if (doc) {
          session = doc.toObject();
          this.sessions.set(sessionId, session);
        }
      } catch (err) {
        console.error('[SessionStore] DB lookup error:', err.message);
      }
    }

    if (!session) return null;

    // Check expiration
    const expiryTime = new Date(session.expiresAt).getTime();
    if (Date.now() > expiryTime) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Synchronous get from memory for high-frequency Socket.IO updates
   */
  getSessionSync(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Verify session using 3 x 6-digit codes
   */
  async verifyByCodes(submittedCodes) {
    if (!Array.isArray(submittedCodes) || submittedCodes.length !== config.CODES_PER_SESSION) {
      return { success: false, reason: 'Must provide exactly 3 codes' };
    }

    const cleanSubmitted = submittedCodes.map(c => String(c).trim());

    // Search active memory sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (Date.now() > new Date(session.expiresAt).getTime()) continue;
      if (session.failedAttempts >= config.MAX_VERIFICATION_ATTEMPTS) continue;

      let allMatch = true;
      for (let i = 0; i < config.CODES_PER_SESSION; i++) {
        if (!timingSafeCompare(session.codes[i], cleanSubmitted[i])) {
          allMatch = false;
          break;
        }
      }

      if (allMatch) {
        return { success: true, session };
      }
    }

    // Search MongoDB Atlas if connected
    if (SessionModel.db.readyState === 1) {
      try {
        const doc = await SessionModel.findOne({
          codes: { $all: cleanSubmitted },
          expiresAt: { $gt: new Date() }
        });

        if (doc) {
          const session = doc.toObject();
          this.sessions.set(session.sessionId, session);
          return { success: true, session };
        }
      } catch (err) {
        console.error('[SessionStore] DB code search error:', err.message);
      }
    }

    return { success: false, reason: 'Invalid session codes or session expired' };
  }

  /**
   * Verify session using QR code token
   */
  async verifyByQRToken(qrToken) {
    if (!qrToken || typeof qrToken !== 'string') {
      return { success: false, reason: 'Invalid QR token format' };
    }

    for (const [sessionId, session] of this.sessions.entries()) {
      if (Date.now() > new Date(session.expiresAt).getTime()) continue;

      if (timingSafeCompare(session.qrToken, qrToken)) {
        return { success: true, session };
      }
    }

    if (SessionModel.db.readyState === 1) {
      try {
        const doc = await SessionModel.findOne({ qrToken, expiresAt: { $gt: new Date() } });
        if (doc) {
          const session = doc.toObject();
          this.sessions.set(session.sessionId, session);
          return { success: true, session };
        }
      } catch (err) {
        console.error('[SessionStore] DB QR search error:', err.message);
      }
    }

    return { success: false, reason: 'Invalid or expired QR token' };
  }

  /**
   * Regenerate QR token for an active session
   */
  async regenerateQRToken(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const newQR = generateQRToken();
    session.qrToken = newQR;

    if (SessionModel.db.readyState === 1) {
      try {
        await SessionModel.updateOne({ sessionId }, { qrToken: newQR });
      } catch (err) {
        console.error('[SessionStore] DB QR update error:', err.message);
      }
    }

    return newQR;
  }

  /**
   * Register a socket connection
   */
  setSocketConnection(sessionId, role, socketId) {
    const session = this.getSessionSync(sessionId);
    if (!session) return false;

    if (role === 'SENDER') {
      session.senderConnected = true;
      session.senderSocketId = socketId;
    } else if (role === 'RECEIVER') {
      session.receiverConnected = true;
      session.receiverSocketId = socketId;
      if (session.status === 'WAITING') {
        session.status = 'CONNECTED';
      }
    }

    if (SessionModel.db.readyState === 1) {
      SessionModel.updateOne({ sessionId }, {
        senderConnected: session.senderConnected,
        receiverConnected: session.receiverConnected,
        status: session.status
      }).catch(() => {});
    }

    return true;
  }

  /**
   * Register socket disconnection
   */
  removeSocketConnection(socketId) {
    let affectedSession = null;
    let disconnectedRole = null;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.senderSocketId === socketId) {
        session.senderConnected = false;
        session.senderSocketId = null;
        affectedSession = session;
        disconnectedRole = 'SENDER';
        break;
      }
      if (session.receiverSocketId === socketId) {
        session.receiverConnected = false;
        session.receiverSocketId = null;
        if (session.status === 'CONNECTED') {
          session.status = 'WAITING';
        }
        affectedSession = session;
        disconnectedRole = 'RECEIVER';
        break;
      }
    }

    if (affectedSession && SessionModel.db.readyState === 1) {
      SessionModel.updateOne({ sessionId: affectedSession.sessionId }, {
        senderConnected: affectedSession.senderConnected,
        receiverConnected: affectedSession.receiverConnected,
        status: affectedSession.status
      }).catch(() => {});
    }

    return { session: affectedSession, role: disconnectedRole };
  }

  /**
   * Add uploaded file metadata to a session
   */
  async addFile(sessionId, fileMeta) {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    session.files.push(fileMeta);

    if (SessionModel.db.readyState === 1) {
      try {
        await SessionModel.updateOne({ sessionId }, {
          $push: { files: fileMeta },
          status: 'COMPLETED'
        });
      } catch (err) {
        console.error('[SessionStore] DB file push error:', err.message);
      }
    }

    return session;
  }

  /**
   * Increment failed verification attempts
   */
  async incrementFailedAttempts(sessionId) {
    const session = await this.getSession(sessionId);
    if (session) {
      session.failedAttempts += 1;
      if (SessionModel.db.readyState === 1) {
        SessionModel.updateOne({ sessionId }, { $inc: { failedAttempts: 1 } }).catch(() => {});
      }
    }
  }

  /**
   * Delete and clean up session data & directory
   */
  async deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    deleteSessionUploadDir(sessionId);

    if (SessionModel.db.readyState === 1) {
      try {
        await SessionModel.deleteOne({ sessionId });
      } catch (err) {
        console.error('[SessionStore] DB session delete error:', err.message);
      }
    }

    console.log(`[SessionStore] Session ${sessionId} and temporary files removed.`);
  }

  /**
   * Cron / timer cleanup for expired sessions
   */
  async cleanupExpired() {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > new Date(session.expiresAt).getTime()) {
        await this.deleteSession(sessionId);
      }
    }
  }
}

export const sessionStore = new SessionStore();
