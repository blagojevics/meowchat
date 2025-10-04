const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");

// Load environment variables FIRST with explicit path
const dotenv = require("dotenv");

// Try multiple .env file locations
const envPaths = [
  path.join(__dirname, ".env"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "backend", ".env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`📁 Loading .env from: ${envPath}`);
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      console.log(`✅ Environment variables loaded from: ${envPath}`);
      break;
    } else {
      console.warn(`⚠️ Error loading ${envPath}:`, result.error.message);
    }
  }
}

if (!envLoaded) {
  console.warn("⚠️ No .env file found, using system environment variables");
  dotenv.config(); // Fallback to default behavior
}

// Debug: Show current working directory and __dirname
console.log(`📍 Current working directory: ${process.cwd()}`);
console.log(`📍 Script directory (__dirname): ${__dirname}`);

// Validate critical environment variables
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "FIREBASE_PROJECT_ID"];
const missingEnvVars = requiredEnvVars.filter((envVar) => {
  const value = process.env[envVar];
  const exists = value && value.trim() !== "";
  console.log(`🔍 Checking ${envVar}: ${exists ? "✅ SET" : "❌ MISSING"}`);
  return !exists;
});

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((envVar) => {
    console.error(`   - ${envVar}: "${process.env[envVar] || "undefined"}"`);
  });
  console.error("📁 Please check your .env file in the backend directory");
  console.error("🔍 Searched paths:", envPaths);
  process.exit(1);
}

console.log("✅ Environment variables loaded successfully");
console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
console.log(`🔧 MongoDB URI: ${process.env.MONGODB_URI ? "SET" : "NOT SET"}`);
console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? "SET" : "NOT SET"}`);
console.log(
  `🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID || "NOT SET"}`
);

const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chats");
const messageRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/upload_simple");
const socketHandlers = require("./socket/socketHandlers");

const app = express();
const server = http.createServer(app);

// CORS origins for MeowGram integration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(url => url.trim()) : 
      ['http://localhost:3000', 'http://localhost:5173'];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    const { userId, userEmail } = socket.handshake.auth;
    if (!userId || !userEmail) {
      console.log("⚠️ Socket auth missing userId or userEmail");
      return next(new Error("Authentication required"));
    }

    // Add user to socket for tracking
    socket.userId = userId;
    socket.userEmail = userEmail;
    console.log(`🔌 Socket authenticated: ${userEmail} (${userId})`);
    next();
  } catch (err) {
    console.error("❌ Socket authentication error:", err);
    next(new Error("Authentication error"));
  }
});

// Connect to MongoDB
connectDB();

// Dynamic CSP configuration based on environment
const isProduction = process.env.NODE_ENV === "production";
const backendUrl =
  process.env.BACKEND_URL ||
  "https://meowchat-backend-production-0763.up.railway.app";

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", ...(isProduction ? [backendUrl] : [])],
        styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:"],
        scriptSrc: [
          "'self'",
          ...(isProduction
            ? ["'unsafe-inline'"]
            : ["'unsafe-eval'", "'unsafe-inline'"]),
        ],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:", "*"],
        connectSrc: [
          "'self'",
          "wss:",
          "https:",
          "ws:",
          "http:",
          ...(isProduction ? [backendUrl] : ["http://localhost:*"]),
        ],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "http:", "data:", "blob:"],
        frameSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
        ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    hsts: isProduction
      ? {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        }
      : false,
  })
);

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files (temporarily without auth to not break functionality)
// TODO: Add auth back after testing: const auth = require("./middleware/auth");
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

// Favicon route to prevent 404 errors
app.get("/favicon.ico", (req, res) => {
  res.status(204).end(); // No content response
});

// Root route for deployment verification
app.get("/", (req, res) => {
  res.json({
    message: "🐱 MeowChat Backend is running!",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      health: "/health",
      api: "/api/health",
      auth: "/api/auth",
      chats: "/api/chats",
      messages: "/api/messages",
      upload: "/api/upload",
    },
  });
});

// Health check endpoint for MeowGram debugging
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    port: process.env.PORT || 5000,
    timestamp: new Date().toISOString(),
    cors: "configured for MeowGram",
    endpoints: {
      auth: "/api/auth/*",
      chats: "/api/chats/*",
      messages: "/api/messages/*",
      uploads: "/api/upload/*",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "MeowChat Backend is running!" });
});

// Socket.io connection handling
socketHandlers(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🐱 MeowChat server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
