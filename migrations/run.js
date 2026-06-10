require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Migrations utilisent la connexion directe (pas le pooler pgBouncer)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function run() {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    console.log(`Running ${file}...`);
    await pool.query(sql);
    console.log(`✓ ${file}`);
  }

  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
