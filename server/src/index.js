const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
require('dotenv').config();
require('./services/db');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true }
});

// Load socket handler
require('./sockets/handler')(io);

// ─── Middleware ───────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

// ─── Protected test route ──────────────────────────────────
const { requireAuth } = require('./middleware/jwt');
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ userId: req.userId });
});

// ─── Health check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Start server ─────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[server] running on port ${PORT}`);
});