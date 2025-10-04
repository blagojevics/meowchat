// MeowChat Backend Server - Production Ready & Refactored
// Last updated: October 4, 2025

// --- 1. IMPORTS ---
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// --- 2. ENVIRONMENT VARIABLE SETUP ---
// Robustly find and load the .env file from multiple possible locations
const envPaths = [
  path.join(__dirname, ".env"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "backend", ".env"),
];
let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    envLoaded = true;
    console.log(`✅ Environment variables loaded from: ${envPath}`);
    break;
  }
}
if (!envLoaded) {
  console.warn("⚠️ No .env file found, using system environment variables.");
  dotenv.config(); // Fallback to default
}

// Validate that critical environment variables are set
const requiredEnvVars = ["MONGODB_URI", "JWT_SECRET", "FIREBASE_PROJECT_ID"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error(
    "❌ CRITICAL ERROR: Missing required environment variables:",
    missingEnvVars.join(", ")
  );
  process.exit(1);
}
console.log("✅ All required environment variables are set.");

// --- 3. DATABASE & ROUTE IMPORTS ---
const connectDB = require("./config/database");
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chats");
const messageRoutes = require("./routes/messages");
const uploadRoutes = require("./routes/upload_simple");
const socketHandlers = require("./socket/socketHandlers");

// --- 4. CORE APP INITIALIZATION (CRITICAL FIX) ---
// Define app, server, and io ONCE at the top.
const app = express();
const server = http.createServer(app);

// --- 5. CORS CONFIGURATION ---
// Define CORS options once and reuse for both Express and Socket.IO
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((url) => url.trim())
  : [
      "https://meowchat-frontend-vite-production.up.railway.app",
      "https://meowgram.online",
      "http://localhost:5173",
      "http://localhost:5174",
    ];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`❌ CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// --- 6. SOCKET.IO INITIALIZATION ---
const io = socketIo(server, { cors: corsOptions });

// --- 7. MIDDLEWARE SETUP ---
// Apply middleware in the correct order AFTER app initialization.
app.use(helmet()); // Provides sensible security defaults
app.use(cors(corsOptions)); // Use the CORS options defined above
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Make io available to all routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- 8. API ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);

// --- 9. HEALTH CHECK & ROOT ROUTES ---
app.get("/", (req, res) => {
  res.json({ message: "🐱 MeowChat Backend is running!", version: "1.0.1" });
});
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// --- 10. SOCKET.IO HANDLERS ---
socketHandlers(io);

// --- 11. SERVER START ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🐱 MeowChat server running successfully on port ${PORT}`);
});

// --- 12. DATABASE CONNECTION ---
connectDB();

module.exports = app;
