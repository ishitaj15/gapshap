const express      = require('express');
const db           = require('../services/db');
const { requireAuth } = require('../middleware/jwt');

const router = express.Router();

// ─── GET MESSAGE HISTORY ──────────────────────────────────
// Returns last 50 messages between two users
router.get('/:conversationId', requireAuth, async (req, res) => {
  const { conversationId } = req.params;

  try {
    const result = await db.query(
      `SELECT m.id, m.content, m.created_at,
              u.id AS sender_id, u.username AS sender_username
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC
       LIMIT 50`,
      [conversationId]
    );

    res.json({ messages: result.rows });

  } catch (err) {
    console.error('[messages] fetch error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET OR CREATE CONVERSATION ───────────────────────────
router.post('/conversation', requireAuth, async (req, res) => {
  const { otherUserId } = req.body;
  const myId = req.userId;

  if (!otherUserId) {
    return res.status(400).json({ error: 'otherUserId required' });
  }

  try {
    // Enforce user_a < user_b (our CHECK constraint)
    const user_a = myId     < otherUserId ? myId     : otherUserId;
    const user_b = myId     < otherUserId ? otherUserId : myId;

    const result = await db.query(
      `INSERT INTO conversations (user_a, user_b)
       VALUES ($1, $2)
       ON CONFLICT (user_a, user_b) DO UPDATE
       SET user_a = EXCLUDED.user_a
       RETURNING *`,
      [user_a, user_b]
    );

    res.json({ conversation: result.rows[0] });

  } catch (err) {
    console.error('[messages] conversation error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET ALL CONVERSATIONS FOR LOGGED-IN USER ─────────────
router.get('/', requireAuth, async (req, res) => {
  const myId = req.userId;

  try {
    const result = await db.query(
      `SELECT
         c.id AS conversation_id,
         c.created_at,
         -- get the other user's info
         CASE WHEN c.user_a = $1 THEN u_b.id   ELSE u_a.id   END AS other_user_id,
         CASE WHEN c.user_a = $1 THEN u_b.username ELSE u_a.username END AS other_username,
         -- last message preview
         m.content    AS last_message,
         m.created_at AS last_message_at,
         m.sender_id  AS last_sender_id
       FROM conversations c
       JOIN users u_a ON u_a.id = c.user_a
       JOIN users u_b ON u_b.id = c.user_b
       LEFT JOIN LATERAL (
         SELECT content, created_at, sender_id
         FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       WHERE c.user_a = $1 OR c.user_b = $1
       ORDER BY COALESCE(m.created_at, c.created_at) DESC`,
      [myId]
    );

    res.json({ conversations: result.rows });
  } catch (err) {
    console.error('[messages] conversations list error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;