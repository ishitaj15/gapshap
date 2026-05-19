const jwt = require('jsonwebtoken');

module.exports = (io) => {

  // ─── Authenticate socket connection ───────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('No token provided'));
    }

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

    // User joins their personal room
    socket.join(socket.userId);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`[socket] user disconnected: ${socket.userId}`);
    });

    // Handle incoming message from browser
    socket.on('send_message', async (data) => {
      const { conversationId, content, recipientId } = data;

      if (!conversationId || !content || !recipientId) return;

      console.log(`[socket] message from ${socket.userId} to ${recipientId}`);

      // Echo back to sender
      socket.emit('new_message', {
        conversationId,
        content,
        senderId:   socket.userId,
        recipientId,
        created_at: new Date().toISOString(),
      });

      // Deliver to recipient if online
      io.to(recipientId).emit('new_message', {
        conversationId,
        content,
        senderId:   socket.userId,
        recipientId,
        created_at: new Date().toISOString(),
      });
    });
  });
};