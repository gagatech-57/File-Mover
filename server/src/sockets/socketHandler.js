import { sessionStore } from '../services/sessionStore.js';

export function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] New connection established: ${socket.id}`);

    /**
     * Join temporary sharing session room
     */
    socket.on('join_session', async ({ sessionId, role, authToken }) => {
      if (!sessionId || !role) {
        return socket.emit('error_message', { message: 'Session ID and role are required' });
      }

      const session = await sessionStore.getSession(sessionId);

      if (!session) {
        return socket.emit('session_expired', { message: 'Session does not exist or has expired' });
      }

      // Verify token for receiver
      if (role === 'RECEIVER' && authToken !== session.authToken) {
        return socket.emit('error_message', { message: 'Invalid session authorization token' });
      }

      // Join Socket room
      const roomName = `session:${sessionId}`;
      socket.join(roomName);

      // Register connection in session store
      sessionStore.setSocketConnection(sessionId, role, socket.id);

      console.log(`[Socket] Client ${socket.id} joined ${roomName} as ${role}`);

      // Notify ALL clients in room (Sender & Receiver) about connection update
      io.to(roomName).emit('peer_connected', {
        role,
        timestamp: Date.now(),
        senderConnected: session.senderConnected,
        receiverConnected: session.receiverConnected
      });

      // Send current session state to room clients
      const safeFiles = Array.isArray(session.files) ? session.files : [];
      io.to(roomName).emit('session_state', {
        sessionId: session.sessionId,
        status: session.status,
        senderConnected: session.senderConnected,
        receiverConnected: session.receiverConnected,
        files: safeFiles.map(f => ({
          id: f.id,
          originalName: f.originalName,
          mimeType: f.mimeType,
          size: f.size
        }))
      });
    });

    /**
     * WebRTC Signaling: Relay SDP Offer from Sender or Receiver
     */
    socket.on('webrtc_offer', ({ sessionId, offer }) => {
      const roomName = `session:${sessionId}`;
      socket.to(roomName).emit('webrtc_offer', { offer, senderSocketId: socket.id });
    });

    /**
     * WebRTC Signaling: Relay SDP Answer
     */
    socket.on('webrtc_answer', ({ sessionId, answer }) => {
      const roomName = `session:${sessionId}`;
      socket.to(roomName).emit('webrtc_answer', { answer, senderSocketId: socket.id });
    });

    /**
     * WebRTC Signaling: Relay ICE Candidate
     */
    socket.on('webrtc_ice_candidate', ({ sessionId, candidate }) => {
      const roomName = `session:${sessionId}`;
      socket.to(roomName).emit('webrtc_ice_candidate', { candidate, senderSocketId: socket.id });
    });

    /**
     * Signal transfer initiation from Sender
     */
    socket.on('transfer_start', async ({ sessionId, fileList, totalBytes }) => {
      const session = await sessionStore.getSession(sessionId);
      if (!session) return;

      session.status = 'TRANSFERRING';
      const roomName = `session:${sessionId}`;

      io.to(roomName).emit('transfer_start', {
        fileList,
        totalBytes,
        timestamp: Date.now()
      });
    });

    /**
     * Real-time progress update from Sender
     */
    socket.on('transfer_progress', ({ sessionId, fileId, bytesTransferred, totalBytes, speed, percent }) => {
      const roomName = `session:${sessionId}`;
      socket.to(roomName).emit('transfer_progress', {
        fileId,
        bytesTransferred,
        totalBytes,
        speed,
        percent
      });
    });

    /**
     * Transfer completion event
     */
    socket.on('transfer_complete', async ({ sessionId, files, newFiles }) => {
      const session = await sessionStore.getSession(sessionId);
      if (session) {
        session.status = 'COMPLETED';
      }

      const roomName = `session:${sessionId}`;
      io.to(roomName).emit('transfer_complete', {
        files,
        newFiles,
        timestamp: Date.now()
      });
    });

    /**
     * Cancel transfer
     */
    socket.on('cancel_transfer', ({ sessionId, reason }) => {
      const roomName = `session:${sessionId}`;
      io.to(roomName).emit('transfer_cancelled', {
        reason: reason || 'Transfer cancelled by user'
      });
    });

    /**
     * Handle socket disconnect
     */
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} (Reason: ${reason})`);

      const { session, role } = sessionStore.removeSocketConnection(socket.id);

      if (session && role) {
        const roomName = `session:${session.sessionId}`;
        io.to(roomName).emit('peer_disconnected', {
          role,
          message: `${role === 'SENDER' ? 'Sender' : 'Receiver'} disconnected.`,
          senderConnected: session.senderConnected,
          receiverConnected: session.receiverConnected
        });
      }
    });
  });
}
