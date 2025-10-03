const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chats");
const messageRoutes = require("./routes/messages");
const socketHandlers = require("./socket/socketHandlers");

// Security middleware imports
const { generalLimiter, authLimiter, messageLimiter, uploadLimiter, chatCreationLimiter } = require("./middleware/rateLimiter");
const { sanitizeInput } = require("./middleware/security");

const app = express();
const server = http.createServer(app);

// CORS origins - restrict to specific domains
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.CORS_ORIGIN] 
  : [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://localhost:3002",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Security Middleware (Applied BEFORE other middleware)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Apply general rate limiting to all requests
app.use(generalLimiter);

// Input sanitization for all requests
app.use(sanitizeInput);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("🚫 CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files with security headers
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res, path) => {
    if (path.endsWith('.exe') || path.endsWith('.bat') || path.endsWith('.cmd')) {
      res.status(403).end();
      return;
    }
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes with specific rate limiting
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/chats", chatCreationLimiter, chatRoutes);
app.use("/api/messages", messageLimiter, messageRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "MeowChat Backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err.message);
  
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Socket.io connection handling
socketHandlers(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🐱 MeowChat server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
