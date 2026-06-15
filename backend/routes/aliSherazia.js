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
const toYear = (val) => {
  if (!val || val === '') return null;
  return String(val).substring(0, 4);
};

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ali_sherazia ORDER BY generation_number NULLS LAST, sibling_order NULLS LAST, id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { name, generation_number, info, parent_id, father_name, mother_name, wife_name, urdu_name, birth_year, death_year, is_alive } = req.body;
  const photo = req.file ? req.file.filename : null;
  if (!name || !generation_number) return res.status(400).json({ msg: 'Name and generation number required' });

  try {
    const result = await pool.query(
      `INSERT INTO ali_sherazia (name, generation_number, info, parent_id, father_name, mother_name, wife_name, urdu_name, birth_year, death_year, is_alive, photo, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, parseInt(generation_number, 10), toNull(info), toNull(parent_id), toNull(father_name), toNull(mother_name), toNull(wife_name), toNull(urdu_name), toYear(birth_year), toYear(death_year), is_alive === 'false' ? false : true, photo, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { id } = req.params;
  const { name, generation_number, info, parent_id, father_name, mother_name, wife_name, urdu_name, birth_year, death_year, is_alive } = req.body;
  const photo = req.file ? req.file.filename : undefined;
  if (!name || !generation_number) return res.status(400).json({ msg: 'Name and generation number required' });

  try {
    let query = `UPDATE ali_sherazia SET name=$1, generation_number=$2, info=$3, parent_id=$4, father_name=$5, mother_name=$6, wife_name=$7, urdu_name=$8, birth_year=$9, death_year=$10, is_alive=$11`;
    const values = [name, parseInt(generation_number, 10), toNull(info), toNull(parent_id), toNull(father_name), toNull(mother_name), toNull(wife_name), toNull(urdu_name), toYear(birth_year), toYear(death_year), is_alive === 'false' ? false : true];

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

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  try {
    const result = await pool.query('DELETE FROM ali_sherazia WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ msg: 'Not found' });
    res.json({ msg: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

module.exports = router;
