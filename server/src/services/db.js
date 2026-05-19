const { Pool } = require('pg');

// Connection pool — reuses connections instead of creating new ones
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Test the connection when server starts
pool.connect((err, client, release) => {
  if (err) {
    console.error('[db] connection failed:', err.message);
    return;
  }
  console.log('[db] connected to postgresql');
  release();
});

module.exports = pool;