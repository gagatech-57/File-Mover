import rateLimit from 'express-rate-limit';

// Global API rate limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // limit each IP to 150 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Strict limiter for verification endpoints (code entry & QR scan)
export const verificationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // max 10 verification attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many code verification attempts. Please wait 1 minute before trying again.'
  }
});

// Limiter for creating new session
export const createSessionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // max 20 sessions created per IP per 5 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Session creation limit reached. Please wait a few minutes.'
  }
});
