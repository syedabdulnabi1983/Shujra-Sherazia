const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // maximum number of clients in the pool (optional)
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds (optional)
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection not established (optional)
});

// Handle connection success
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database successfully');
});

// Handle connection errors (optional but recommended)
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;