const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../db');

// Middleware - Admin Check
const isAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided!' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token!' });
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Admin access required!' });
        req.userId = decoded.id;
        next();
    });
};

// Get All Users (Admin only)
router.get('/users', isAdmin, async (req, res) => {
    try {
        const users = await pool.query(
            'SELECT id, name, email, phone, role, password, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User (Admin only)
router.delete('/users/:id', isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'User deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Edit Member (Admin only)
router.put('/members/:id', isAdmin, async (req, res) => {
    try {
        const { name, gender, birth_date, death_date } = req.body;
        await pool.query(
            'UPDATE members SET name = $1, gender = $2, birth_date = $3, death_date = $4 WHERE id = $5',
            [name, gender, birth_date, death_date, req.params.id]
        );
        res.json({ message: 'Member updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Member (Admin only)
router.delete('/members/:id', isAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM members WHERE id = $1', [req.params.id]);
        res.json({ message: 'Member deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Reset User Password (Admin only)
router.put('/reset-password/:id', isAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
        res.json({ message: 'Password reset successfully!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;