const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const db     = require('./db');

// Generate a new access token (JWT)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Generate a refresh token and store its hash in DB
const generateRefreshToken = async (userId) => {
  // Random token — not a JWT
  const token = crypto.randomBytes(40).toString('hex');

  // Store hash in DB (never store raw tokens)
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  await db.query(
    `INSERT INTO refresh_tokens (token_hash, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [hash, userId]
  );

  return token;
};

// Verify a refresh token and return userId
const verifyRefreshToken = async (token) => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const result = await db.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1
     AND revoked = FALSE
     AND expires_at > NOW()`,
    [hash]
  );

  if (result.rows.length === 0) return null;

  return result.rows[0].user_id;
};

// Revoke a refresh token (logout)
const revokeRefreshToken = async (token) => {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  await db.query(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
    [hash]
  );
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
};