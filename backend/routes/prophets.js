const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const toNull = (val) => (val && val !== '' ? val : null);

// GET all prophets
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM prophets_chain ORDER BY generation_number, id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST new prophet (admin only)
router.post('/', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const {
    name, generation_number, info, parent_id,
    father_name, mother_name, wife_name, urdu_name,
    birth_year, death_year, is_alive
  } = req.body;
  const photo = req.file ? req.file.filename : null;

  if (!name) return res.status(400).json({ msg: 'Name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO prophets_chain
        (name, generation_number, info, parent_id,
         father_name, mother_name, wife_name, urdu_name,
         birth_year, death_year, is_alive, photo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        name,
        generation_number || null,
        toNull(info),
        toNull(parent_id) || null,
        toNull(father_name),
        toNull(mother_name),
        toNull(wife_name),
        toNull(urdu_name),
        toNull(birth_year),
        toNull(death_year),
        is_alive === 'false' ? false : true,
        photo
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// PUT update prophet (admin only)
router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { id } = req.params;
  const {
    name, generation_number, info, parent_id,
    father_name, mother_name, wife_name, urdu_name,
    birth_year, death_year, is_alive
  } = req.body;
  const photo = req.file ? req.file.filename : undefined;

  if (!name) return res.status(400).json({ msg: 'Name is required' });

  try {
    let query = `UPDATE prophets_chain SET
      name=$1, generation_number=$2, info=$3, parent_id=$4,
      father_name=$5, mother_name=$6, wife_name=$7, urdu_name=$8,
      birth_year=$9, death_year=$10, is_alive=$11`;
    const values = [
      name,
      generation_number || null,
      toNull(info),
      toNull(parent_id) || null,
      toNull(father_name),
      toNull(mother_name),
      toNull(wife_name),
      toNull(urdu_name),
      toNull(birth_year),
      toNull(death_year),
      is_alive === 'false' ? false : true
    ];

    if (photo) {
      query += ', photo=$12 WHERE id=$13 RETURNING *';
      values.push(photo, id);
    } else {
      query += ' WHERE id=$12 RETURNING *';
      values.push(id);
    }

    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ msg: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// DELETE prophet (admin only)
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