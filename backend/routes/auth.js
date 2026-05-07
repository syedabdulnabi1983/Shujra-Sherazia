const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Register (Member ya Admin)
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;
        
        console.log('Register attempt:', { name, email, phone, role });
        
        // Check existing user
        const existing = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR phone = $2', 
            [email, phone]
        );
        
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email ya Phone pehle se registered hai!' });
        }

        // Password hash
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert user
        const result = await pool.query(
            'INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role',
            [name, email, phone, hashedPassword, role || 'member']
        );

        console.log('User registered:', result.rows[0]);
        res.json({ message: 'Registration successful!', user: result.rows[0] });
    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt:', email);
        
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password!' });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ error: 'Invalid email or password!' });
        }

        // JWT Token
        const token = jwt.sign(
            { id: user.rows[0].id, role: user.rows[0].role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.rows[0].id,
                name: user.rows[0].name,
                email: user.rows[0].email,
                role: user.rows[0].role
            }
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Password Recovery via Phone
router.post('/forgot-password', async (req, res) => {
    try {
        const { phone } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        
        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Phone number not registered!' });
        }

        const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        await pool.query(
            'UPDATE users SET reset_code = $1, reset_code_expiry = NOW() + INTERVAL $2 WHERE phone = $3',
            [recoveryCode, '10 minutes', phone]
        );

        res.json({ 
            message: 'Recovery code generated!',
            code: recoveryCode,
            note: 'In production, this code will be sent via SMS'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset Password with Code
router.post('/reset-password', async (req, res) => {
    try {
        const { phone, code, newPassword } = req.body;
        
        const user = await pool.query(
            "SELECT * FROM users WHERE phone = $1 AND reset_code = $2 AND reset_code_expiry > NOW()",
            [phone, code]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired code!' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.query(
            "UPDATE users SET password = $1, reset_code = NULL, reset_code_expiry = NULL WHERE phone = $2",
            [hashedPassword, phone]
        );

        res.json({ message: 'Password reset successful! Please login.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Direct Password Reset (Admin only)
router.post('/reset-password-direct', async (req, res) => {
    try {
        const { userId, newPassword } = req.body;
        const token = req.headers['authorization']?.split(' ')[1];
        
        if (!token) return res.status(401).json({ error: 'No token!' });
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin only!' });
        
        const hashed = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
        
        res.json({ message: 'Password reset successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;