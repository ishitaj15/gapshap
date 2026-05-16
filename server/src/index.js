const express = require('express');
const http    = require('http');
const cors    = require('cors');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);

// ─── Middleware ───────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ─── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[server] running on port ${PORT}`);
});