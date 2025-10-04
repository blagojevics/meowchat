import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// THIS IS THE LINE THAT FIXES IT
const PORT = process.env.PORT || 3000;

const distPath = path.resolve(__dirname, 'dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// THIS LINE USES THE CORRECT PORT
app.listen(PORT, () => {
  console.log(`✅ MeowChat Frontend server listening on port ${PORT}`);