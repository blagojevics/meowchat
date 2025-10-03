const rateLimit = require('express-rate-limit');

// Rate limiting configurations for different endpoints
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: (req, res) => {
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// General API rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for authentication endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 auth requests per windowMs
  'Too many authentication attempts from this IP, please try again after 15 minutes.'
);

// Message sending rate limiting
const messageLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  30, // limit each IP to 30 messages per minute
  'Too many messages sent, please slow down.'
);

// File upload rate limiting
const uploadLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  10, // limit each IP to 10 uploads per 5 minutes
  'Too many file uploads, please try again later.'
);

// Chat creation rate limiting
const chatCreationLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 chat creations per 15 minutes
  'Too many chats created, please wait before creating more.'
);

module.exports = {
  generalLimiter,
  authLimiter,
  messageLimiter,
  uploadLimiter,
  chatCreationLimiter
};