const express = require('express');
const bcrypt  = require('bcrypt');
const db      = require('../services/db');

const router = express.Router();

// ─── SIGNUP ───────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Hash the password before storing it
    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, password_hash]
    );

    res.status(201).json({ user: result.rows[0] });

  } catch (err) {
    // Duplicate username or email
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('[auth] signup error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;