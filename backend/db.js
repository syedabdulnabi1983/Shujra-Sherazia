const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Tables Create Karne Ka Function
const createTables = async () => {
    try {
        await pool.query(`
            -- Users Table (Admin aur Members)
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20) UNIQUE NOT NULL,
                password VARCHAR(200) NOT NULL,
                role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Khandan Table (Family Groups)
            CREATE TABLE IF NOT EXISTS khandan (
                id SERIAL PRIMARY KEY,
                khandan_code VARCHAR(10) UNIQUE NOT NULL,
                khandan_name VARCHAR(100) NOT NULL,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Members Table (Family Tree Individuals)
            CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY,
                khandan_id INTEGER REFERENCES khandan(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                gender VARCHAR(10) CHECK (gender IN ('male', 'female')),
                birth_date DATE,
                death_date DATE,
                parent_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
                spouse_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
                position_x INTEGER DEFAULT 0,
                position_y INTEGER DEFAULT 0,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ All tables created successfully!');
    } catch (err) {
        console.error('❌ Table creation error:', err.message);
    }
};

pool.connect()
    .then(async () => {
        console.log('✅ Database connected successfully!');
        await createTables();
    })
    .catch(err => console.error('❌ Database connection error:', err.message));

module.exports = pool;