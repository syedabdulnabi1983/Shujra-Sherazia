const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

function publicUser(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
    };
}

function getToken(req) {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    return req.cookies.token || bearerToken;
}

function requireAuth(req, res, next) {
    const token = getToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
}

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials!' });
        }

        const valid = await bcrypt.compare(password, user.rows[0].password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials!' });
        }

        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            token,
            user: publicUser(user.rows[0]),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/register', async (req, res) => {
    const client = await pool.connect();

    try {
        const { name, email, password, repeatPassword, code } = req.body;
        const cleanName = String(name || '').trim();
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanCode = String(code || '').trim();

        if (!cleanName || !cleanEmail || !password || !repeatPassword || !cleanCode) {
            return res.status(422).json({ error: 'Please fill all registration fields.' });
        }

        if (password !== repeatPassword) {
            return res.status(422).json({ error: 'Passwords do not match.' });
        }

        await client.query('BEGIN');

        const codeResult = await client.query(
            'SELECT * FROM registration_codes WHERE code = $1 AND is_used = FALSE FOR UPDATE',
            [cleanCode]
        );

        if (codeResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Invalid or already used registration code.' });
        }

        const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'This email is already registered.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userResult = await client.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
            [cleanName, cleanEmail, hashedPassword, codeResult.rows[0].role || 'member']
        );

        await client.query(
            'UPDATE registration_codes SET is_used = TRUE, used_by = $1, used_at = CURRENT_TIMESTAMP WHERE id = $2',
            [userResult.rows[0].id, codeResult.rows[0].id]
        );

        await client.query('COMMIT');
        res.status(201).json({ success: true, user: userResult.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/codes', requireAuth, requireAdmin, async (req, res) => {
    try {
        const requestedCode = String(req.body.code || '').trim();
        const code = requestedCode || `SHJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

        const result = await pool.query(
            'INSERT INTO registration_codes (code, role, created_by) VALUES ($1, $2, $3) RETURNING id, code, role, is_used, created_at',
            [code, 'member', req.user.id]
        );

        res.status(201).json({ success: true, code: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This code already exists.' });
        }

        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

router.get('/me', async (req, res) => {
    const token = getToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [decoded.id]);

        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;
