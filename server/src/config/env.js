import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://gunaknn_db_user:100EOOYTaq3M13U3@cluster0.mgucgen.mongodb.net/fileshare?retryWrites=true&w=majority',
  
  // File transfer limits
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || '524288000', 10), // 500 MB default max file
  MAX_FILES_PER_SESSION: parseInt(process.env.MAX_FILES_PER_SESSION || '20', 10),
  MAX_TOTAL_SESSION_SIZE_BYTES: parseInt(process.env.MAX_TOTAL_SESSION_SIZE_BYTES || '2147483648', 10), // 2 GB default
  
  // Expiration and timeouts
  SESSION_EXPIRATION_MINUTES: parseInt(process.env.SESSION_EXPIRATION_MINUTES || '20', 10),
  CLEANUP_INTERVAL_SECONDS: parseInt(process.env.CLEANUP_INTERVAL_SECONDS || '60', 10),
  
  // Security
  MAX_VERIFICATION_ATTEMPTS: 5,
  CODES_PER_SESSION: 3,
  CODE_LENGTH: 6,
  
  // Upload directory
  UPLOADS_DIR: process.env.UPLOADS_DIR || './uploads/temp_sessions'
};
