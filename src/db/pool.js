const { Pool } = require('pg');

// Supabase utilise pgBouncer (transaction mode) qui ne supporte pas les prepared statements
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

module.exports = pool;
