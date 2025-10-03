const express = require("express");
const path = require("path");
const app = express();
const PORT = process.env.PORT || 4173;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, "dist")));

// Handle React Router - send all requests to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ MeowChat Frontend serving static files on port ${PORT}`);
  console.log(`🚀 Production build from: ${path.join(__dirname, "dist")}`);
});
