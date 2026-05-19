const jwt    = require('jsonwebtoken');
const bridge = require('../services/cppBridge');

module.exports = (io) => {

  // ─── Authenticate socket connection ───────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token provided'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // ─── Handle connections ────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`[socket] user connected: ${socket.userId}`);

    // Join personal room
    socket.join(socket.userId);

    // Tell C++ this user is now online
    bridge.authenticate(socket.userId);

    // ─── Handle message from browser ──────────────────
    socket.on('send_message', (data) => {
      const { conversationId, content, recipientId } = data;
      if (!conversationId || !content || !recipientId) return;

      // Forward to C++ server — it saves to DB and delivers
      bridge.sendMessage(
        conversationId,
        socket.userId,
        recipientId,
        content
      );

      // Echo back to sender immediately
      socket.emit('new_message', {
        conversationId,
        content,
        senderId:   socket.userId,
        recipientId,
        created_at: new Date().toISOString(),
      });
    });

    // ─── Handle disconnection ─────────────────────────
    socket.on('disconnect', () => {
      console.log(`[socket] user disconnected: ${socket.userId}`);
      bridge.userDisconnected(socket.userId);
    });
  });

  // ─── Deliver messages from C++ to recipient ───────────
  bridge.onDeliver = (data) => {
    const { recipientId } = data;
    if (recipientId) {
      io.to(recipientId).emit('new_message', data);
    }
  };
};