const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 4173;

// MAXIMUM DEBUG LOGGING FOR RAILWAY
console.log("🔥🔥🔥 RAILWAY DEBUG START 🔥🔥🔥");
console.log("🚀 EXPRESS SERVER STARTING (NOT VITE!)");
console.log("📁 Current directory:", __dirname);
console.log("📁 Dist directory:", path.join(__dirname, "dist"));
console.log("🌐 Port:", PORT);
console.log("🐧 Platform:", process.platform);
console.log("🚀 Node version:", process.version);
console.log("📊 Process args:", process.argv);
console.log("🔧 Environment vars:");
console.log("   - NODE_ENV:", process.env.NODE_ENV);
console.log("   - PORT:", process.env.PORT);
console.log("   - PWD:", process.env.PWD);

// List all files in current directory
console.log("📂 Files in current directory:");
try {
  const files = fs.readdirSync(__dirname);
  files.forEach((file) => {
    const stats = fs.statSync(path.join(__dirname, file));
    console.log(`   ${stats.isDirectory() ? "📁" : "📄"} ${file}`);
  });
} catch (err) {
  console.error("❌ Error reading directory:", err);
}

// Check if dist folder exists
const distPath = path.join(__dirname, "dist");
console.log("🔍 Checking dist folder at:", distPath);
if (!fs.existsSync(distPath)) {
  console.error("❌ CRITICAL ERROR: dist folder not found!");
  console.error("📂 Current directory contents:", fs.readdirSync(__dirname));
  console.error("💡 This means Railway is NOT running our Express server!");
  console.error("🚨 Railway is probably still auto-detecting Vite dev server!");
  process.exit(1);
}

console.log("✅ Dist folder found");

// List dist folder contents
console.log("📂 Dist folder contents:");
try {
  const distFiles = fs.readdirSync(distPath);
  distFiles.forEach((file) => {
    const stats = fs.statSync(path.join(distPath, file));
    console.log(`   ${stats.isDirectory() ? "📁" : "📄"} ${file}`);
  });
} catch (err) {
  console.error("❌ Error reading dist directory:", err);
}

const indexPath = path.join(distPath, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("❌ ERROR: index.html not found at:", indexPath);
  process.exit(1);
}

console.log("✅ Index.html found");
console.log("📄 Index.html size:", fs.statSync(indexPath).size, "bytes");

// Read and log first 200 chars of index.html
try {
  const indexContent = fs.readFileSync(indexPath, "utf8");
  console.log("📄 Index.html preview:", indexContent.substring(0, 200));
} catch (err) {
  console.error("❌ Error reading index.html:", err);
}

// Security headers
app.use((req, res, next) => {
  res.header("X-Content-Type-Options", "nosniff");
  res.header("X-Frame-Options", "DENY");
  res.header("X-XSS-Protection", "1; mode=block");
  next();
});

// Set proper MIME types for static files
app.use((req, res, next) => {
  if (req.path.endsWith(".js")) {
    res.type("application/javascript");
  } else if (req.path.endsWith(".css")) {
    res.type("text/css");
  } else if (req.path.endsWith(".json")) {
    res.type("application/json");
  }
  next();
});

// MAXIMUM REQUEST LOGGING
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`   📋 Headers:`, req.headers);
  console.log(`   🔍 Query:`, req.query);
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
  console.log(`🔄 Fallback: Serving index.html for: ${req.path}`);
  res.type("text/html");
  res.sendFile(indexPath);
});

// Error handling
app.use((err, req, res, next) => {
  console.error("❌ Server error:", err);
  res.status(500).send("Internal Server Error");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🔥🔥🔥 EXPRESS SERVER SUCCESSFULLY STARTED 🔥🔥🔥");
  console.log(`✅ MeowChat Frontend serving static files on port ${PORT}`);
  console.log(`🚀 Production build from: ${distPath}`);
  console.log(`🌐 Server URL: http://0.0.0.0:${PORT}`);
  console.log("📊 Ready to handle requests!");
  console.log("🔥🔥🔥 IF YOU SEE VITE DEV SERVER, RAILWAY IS BROKEN! 🔥🔥🔥");
});
