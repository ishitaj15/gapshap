const jwt = require('jsonwebtoken');

// Middleware to protect routes that require login
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // Token comes as "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { requireAuth };