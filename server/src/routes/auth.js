const express = require('express');
const bcrypt  = require('bcrypt');
const db      = require('../services/db');
const { loginRateLimit } = require('../middleware/rateLimit');

const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} = require('../services/tokenService');

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

// ─── LOGIN ────────────────────────────────────────────────
router.post('/login', loginRateLimit, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Find user by email
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    // Don't reveal whether email exists or not
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Compare password against stored hash
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate both tokens
  const accessToken  = generateAccessToken(user.id);
  const refreshToken = await generateRefreshToken(user.id);

  res.json({
    accessToken,
    refreshToken,
    user: {
      id:       user.id,
      username: user.username,
      email:    user.email,
    }
  });

  } catch (err) {
    console.error('[auth] login error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── REFRESH TOKEN ────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const userId = await verifyRefreshToken(refreshToken);

    if (!userId) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const accessToken = generateAccessToken(userId);
    res.json({ accessToken });

  } catch (err) {
    console.error('[auth] refresh error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    await revokeRefreshToken(refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('[auth] logout error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;