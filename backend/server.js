const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

// Load environment variables FIRST
require("dotenv").config();

// Validate critical environment variables
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "FIREBASE_PROJECT_ID"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((envVar) => {
    console.error(`   - ${envVar}`);
  });
  console.error("📁 Please check your .env file in the backend directory");
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
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:5173", // MeowGram frontend (CRITICAL)
  "http://localhost:5174", // Alternative port
  "http://localhost:5175",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

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

// Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
    optionsSuccessStatus: 200, // For legacy browser support
  })
);
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
