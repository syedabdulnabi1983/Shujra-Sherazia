CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS khandan (
    id SERIAL PRIMARY KEY,
    khandan_code VARCHAR(20) NOT NULL UNIQUE,
    khandan_name VARCHAR(160) NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registration_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    used_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    khandan_id INTEGER NOT NULL REFERENCES khandan(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    gender VARCHAR(20) NOT NULL DEFAULT 'male',
    parent_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    spouse_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
    father_name VARCHAR(160),
    mother_name VARCHAR(160),
    spouse_name VARCHAR(160),
    birth_year INTEGER,
    death_year INTEGER,
    remarks TEXT,
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (name, email, password, role)
VALUES ('Admin', 'admin@shujra.com', '$2a$10$GsZxeusMRCOIMAgmmYBSMeUGnkYb2LQr6M4y9wZr1CdNA7g7dpRGu', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO khandan (khandan_code, khandan_name, created_by)
SELECT 'KHD0001', 'Shujra Sherazia', users.id
FROM users
WHERE users.email = 'admin@shujra.com'
ON CONFLICT (khandan_code) DO NOTHING;
