const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 4173;

// Debug information
console.log("🚀 Starting MeowChat Express Server");
console.log("📁 Current directory:", __dirname);
console.log("📁 Dist directory:", path.join(__dirname, "dist"));
console.log("🌐 Port:", PORT);

// Check if dist folder exists
const distPath = path.join(__dirname, "dist");
if (!fs.existsSync(distPath)) {
  console.error("❌ ERROR: dist folder not found at:", distPath);
  console.error("💡 Running build first...");
  process.exit(1);
}

const indexPath = path.join(distPath, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ ERROR: index.html not found at:", indexPath);
  process.exit(1);
}

console.log("✅ Dist folder found");
console.log("✅ Index.html found");

// Security headers
app.use((req, res, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");
  next();
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve static files from dist directory
app.use(
  express.static(distPath, {
    maxAge: "1d",
    etag: false,
  })
);

// Handle React Router - send all requests to index.html
app.get("*", (req, res) => {
  console.log(`🔄 Serving index.html for: ${req.path}`);
  res.sendFile(indexPath);
});

// Error handling
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).send("Internal Server Error");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ MeowChat Frontend serving static files on port ${PORT}`);
  console.log(`🚀 Production build from: ${distPath}`);
  console.log(`🌐 Server URL: http://0.0.0.0:${PORT}`);
  console.log("📊 Ready to handle requests!");
});
