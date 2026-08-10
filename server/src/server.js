import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import sessionRoutes from './routes/sessionRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeSocketHandlers } from './sockets/socketHandler.js';
import { startCleanupTask } from './services/cleanupService.js';
import { ensureDirExists } from './utils/fileUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app & HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e8 // 100 MB buffer max
});

// Middleware configuration
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiting
app.use('/api', globalLimiter);

// Make upload directory
ensureDirExists(config.UPLOADS_DIR);

// Mount API Routes
app.use('/api/sessions', sessionRoutes);
app.use('/api/sessions', fileRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'File Mover Engine with MongoDB Atlas',
    timestamp: new Date().toISOString()
  });
});

// Serve static React client files in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

// Global Error Middleware
app.use(errorHandler);

// Attach Socket.IO Handlers
initializeSocketHandlers(io);

// Start background cleanup timer
startCleanupTask();

// Connect to MongoDB Atlas and start HTTP server
connectDB().then(() => {
  server.listen(config.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 File Mover Server running on http://localhost:${config.PORT}`);
    console.log(`🍃 MongoDB Atlas connected (Auto-TTL session expiry)`);
    console.log(`⏱️  Session Expiration: ${config.SESSION_EXPIRATION_MINUTES} mins`);
    console.log(`🔒 Security: Zero Accounts | Ephemeral Database Model`);
    console.log(`=======================================================`);
  });
});
