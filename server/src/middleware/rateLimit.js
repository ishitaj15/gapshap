// In-memory sliding window rate limiter
// Limits login attempts per IP address

const attempts = new Map();

const WINDOW_MS  = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;            // max 10 attempts per window

const loginRateLimit = (req, res, next) => {
  const ip  = req.ip;
  const now = Date.now();

  if (!attempts.has(ip)) {
    attempts.set(ip, []);
  }

  // Remove attempts outside the window
  const windowStart = now - WINDOW_MS;
  const recent = attempts.get(ip).filter(t => t > windowStart);
  attempts.set(ip, recent);

  if (recent.length >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: `Too many login attempts. Try again in 15 minutes.`
    });
  }

  // Record this attempt
  recent.push(now);
  next();
};

module.exports = { loginRateLimit };