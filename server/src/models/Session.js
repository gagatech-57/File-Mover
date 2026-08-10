import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  id: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, default: 'application/octet-stream' },
  size: { type: Number, required: true },
  tempPath: { type: String },
  uploadedBytes: { type: Number, default: 0 },
  completed: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  codes: [{ type: String, required: true }],
  qrToken: { type: String, required: true, index: true },
  authToken: { type: String, required: true },
  status: {
    type: String,
    enum: ['WAITING', 'CONNECTED', 'TRANSFERRING', 'COMPLETED', 'EXPIRED'],
    default: 'WAITING'
  },
  senderConnected: { type: Boolean, default: false },
  receiverConnected: { type: Boolean, default: false },
  senderSocketId: { type: String, default: null },
  receiverSocketId: { type: String, default: null },
  files: [FileSchema],
  failedAttempts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 } // MongoDB automatic TTL deletion!
});

export const SessionModel = mongoose.model('Session', SessionSchema);
