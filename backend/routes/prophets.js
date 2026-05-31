const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// GET – sab dekh sakte hain
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM prophets_chain ORDER BY generation_number');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST – sirf admin
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { name, generation_number, info, parent_id } = req.body;
  if (!name || !generation_number) return res.status(400).json({ msg: 'Name and generation number required' });

  try {
    const result = await pool.query(
      'INSERT INTO prophets_chain (name, generation_number, info, parent_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, generation_number, info || null, parent_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// PUT – sirf admin
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { id } = req.params;
  const { name, generation_number, info, parent_id } = req.body;

  try {
    const result = await pool.query(
      'UPDATE prophets_chain SET name=$1, generation_number=$2, info=$3, parent_id=$4 WHERE id=$5 RETURNING *',
      [name, generation_number, info || null, parent_id || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ msg: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// DELETE – sirf admin
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { id } = req.params;
  try {
    await pool.query('DELETE FROM prophets_chain WHERE id=$1', [id]);
    res.json({ msg: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

module.exports = router;