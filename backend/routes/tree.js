const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Middleware - Auth Check
const isAuth = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided!' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token!' });
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    });
};

// Create Khandan (Family Group)
router.post('/khandan', isAuth, async (req, res) => {
    try {
        const { khandan_name } = req.body;
        
        const codeResult = await pool.query('SELECT COUNT(*) FROM khandan');
        const count = parseInt(codeResult.rows[0].count) + 1;
        const khandan_code = 'KHD' + String(count).padStart(4, '0');
        
        const result = await pool.query(
            'INSERT INTO khandan (khandan_code, khandan_name, created_by) VALUES ($1, $2, $3) RETURNING *',
            [khandan_code, khandan_name, req.userId]
        );
        
        res.json({ message: 'Khandan created!', khandan: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get All Khandans (Public)
router.get('/khandans', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM khandan ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add Member to Tree
router.post('/member', isAuth, async (req, res) => {
    try {
        const { khandan_id, name, gender, birth_date, parent_id, spouse_id } = req.body;
        
        // Fix parent_id - agar empty string ya null hai to null bhejo
        const finalParentId = (parent_id === "" || parent_id === null || parent_id === undefined) ? null : parseInt(parent_id);
        
        const result = await pool.query(
            'INSERT INTO members (khandan_id, name, gender, birth_date, parent_id, spouse_id, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [khandan_id, name, gender, birth_date, finalParentId, spouse_id, req.userId]
        );
        
        res.json({ message: 'Member added!', member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Tree Data (Public)
router.get('/tree/:khandan_id', async (req, res) => {
    try {
        const members = await pool.query(
            'SELECT * FROM members WHERE khandan_id = $1 ORDER BY id',
            [req.params.khandan_id]
        );
        res.json(members.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Member (Owner ya Admin)
router.put('/member/:id', isAuth, async (req, res) => {
    try {
        const member = await pool.query('SELECT * FROM members WHERE id = $1', [req.params.id]);
        
        if (member.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found!' });
        }

        if (req.userRole !== 'admin' && member.rows[0].created_by !== req.userId) {
            return res.status(403).json({ error: 'You can only edit your own entries!' });
        }

        const { name, gender, birth_date, death_date } = req.body;
        await pool.query(
            'UPDATE members SET name = $1, gender = $2, birth_date = $3, death_date = $4 WHERE id = $5',
            [name, gender, birth_date, death_date, req.params.id]
        );
        
        res.json({ message: 'Member updated!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Member (Admin only)
router.delete('/member/:id', isAuth, async (req, res) => {
    try {
        if (req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Only admin can delete members!' });
        }
        await pool.query('DELETE FROM members WHERE id = $1', [req.params.id]);
        res.json({ message: 'Member deleted!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;