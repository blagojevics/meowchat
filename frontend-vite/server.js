import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.resolve(__dirname, "dist");

// Serve static files from the 'dist' folder
app.use(express.static(distPath));

// Fallback route for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ MeowChat Frontend server listening on port ${PORT}`);
});
