const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

function getToken(req) {
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    return req.cookies.token || bearerToken;
}

const isAuth = (req, res, next) => {
    const token = getToken(req);

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized!' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token!' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required!' });
    }

    next();
};

router.get('/khandans', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM khandan ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/khandan', isAuth, isAdmin, async (req, res) => {
    try {
        const khandanName = (req.body.khandan_name || '').trim();

        if (!khandanName) {
            return res.status(422).json({ error: 'Khandan name is required' });
        }

        const countResult = await pool.query('SELECT COUNT(*) FROM khandan');
        const count = Number.parseInt(countResult.rows[0].count, 10) + 1;
        const khandanCode = 'KHD' + String(count).padStart(4, '0');

        const result = await pool.query(
            'INSERT INTO khandan (khandan_code, khandan_name, created_by) VALUES ($1, $2, $3) RETURNING *',
            [khandanCode, khandanName, req.user.id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/tree/:khandan_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, khandan_id, name, gender, parent_id, spouse_id,
                    father_name, mother_name, spouse_name,
                    birth_year, death_year, remarks, is_alive,
                    created_by, created_at, updated_at
             FROM members
             WHERE khandan_id = $1
             ORDER BY id`,
            [req.params.khandan_id]
        );

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/member', isAuth, async (req, res) => {
    try {
        const {
            khandan_id,
            name,
            gender,
            parent_id,
            spouse_id,
            spouse_name,
            father_name,
            mother_name,
            birth_year,
            death_year,
            remarks,
            is_alive,
        } = req.body;

        if (!khandan_id || !name || !String(name).trim()) {
            return res.status(422).json({ error: 'Khandan and member name are required' });
        }

        const result = await pool.query(
            `INSERT INTO members
                (khandan_id, name, gender, parent_id, spouse_id, spouse_name, father_name, mother_name,
                 birth_year, death_year, remarks, is_alive, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING *`,
            [
                khandan_id,
                String(name).trim(),
                gender || 'male',
                parent_id || null,
                spouse_id || null,
                spouse_name || null,
                father_name || null,
                mother_name || null,
                birth_year || null,
                death_year || null,
                remarks || null,
                is_alive !== false,
                req.user.id,
            ]
        );

        if (spouse_id) {
            await pool.query('UPDATE members SET spouse_id = $1 WHERE id = $2', [result.rows[0].id, spouse_id]);
        }

        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/member/:id', isAuth, async (req, res) => {
    try {
        const {
            name,
            gender,
            parent_id,
            spouse_id,
            spouse_name,
            father_name,
            mother_name,
            birth_year,
            death_year,
            remarks,
            is_alive,
        } = req.body;

        const result = await pool.query(
            `UPDATE members
             SET name = $1,
                 gender = $2,
                 parent_id = $3,
                 spouse_id = $4,
                 spouse_name = $5,
                 father_name = $6,
                 mother_name = $7,
                 birth_year = $8,
                 death_year = $9,
                 remarks = $10,
                 is_alive = $11,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $12
             RETURNING *`,
            [
                String(name || '').trim(),
                gender || 'male',
                parent_id || null,
                spouse_id || null,
                spouse_name || null,
                father_name || null,
                mother_name || null,
                birth_year || null,
                death_year || null,
                remarks || null,
                is_alive !== false,
                req.params.id,
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        if (spouse_id) {
            await pool.query('UPDATE members SET spouse_id = $1 WHERE id = $2', [req.params.id, spouse_id]);
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/members/:id', isAuth, isAdmin, async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid member ID' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const memberCheck = await client.query('SELECT * FROM members WHERE id = $1', [id]);
        if (memberCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Member not found' });
        }

        await client.query('UPDATE members SET spouse_id = NULL WHERE spouse_id = $1', [id]);
        await client.query('UPDATE members SET parent_id = NULL WHERE parent_id = $1', [id]);
        await client.query('DELETE FROM members WHERE id = $1', [id]);
        await client.query('COMMIT');

        res.json({ success: true, message: 'Member deleted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
});

module.exports = router;
