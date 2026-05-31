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

// ✅ Fixed yearToDate – rejects any all‑zero string like "0000", "0", "00", etc.
const yearToDate = (val) => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed === '' || /^0+$/.test(trimmed)) return null;   // "0", "00", "0000" etc.
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`;
  }
  return null;
};

// GET tree with is_alive
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        n.*,
        f.name AS father_name_db,
        s.name AS spouse_name_db,
        s.id AS spouse_node_id,
        n.is_alive,
        n.father_name,
        n.mother_name,
        n.wife_name,
        n.urdu_name,
        n.info,
        n.photo,
        n.birth_date,
        n.death_date
      FROM tree_nodes n
      LEFT JOIN tree_nodes f ON n.parent_id = f.id
      LEFT JOIN tree_nodes s ON n.spouse_id = s.id
      ORDER BY n.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST add node
router.post('/', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'member' && req.user.role !== 'admin') {
    return res.status(403).json({ msg: 'Access denied' });
  }

  const name = req.body.name;
  const parent_id = toNull(req.body.parent_id) ? parseInt(req.body.parent_id) : null;
  const spouse_id = toNull(req.body.spouse_id) ? parseInt(req.body.spouse_id) : null;
  const birth_date = yearToDate(req.body.birth_date);
  const death_date = yearToDate(req.body.death_date);
  const father_name = toNull(req.body.father_name);
  const mother_name = toNull(req.body.mother_name);
  const wife_name = toNull(req.body.wife_name);
  const urdu_name = toNull(req.body.urdu_name);
  const info = toNull(req.body.info);
  const photo = req.file ? req.file.filename : null;

  let is_alive;
  if (req.body.is_alive !== undefined) {
    is_alive = req.body.is_alive === 'true' || req.body.is_alive === true;
  } else {
    is_alive = !death_date;
  }
  const final_death_date = is_alive ? null : death_date;

  if (!name) return res.status(400).json({ msg: 'Name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO tree_nodes (name, parent_id, spouse_id, birth_date, death_date, father_name, mother_name, wife_name, urdu_name, info, photo, added_by, is_alive)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [name, parent_id, spouse_id, birth_date, final_death_date, father_name, mother_name, wife_name, urdu_name, info, photo, req.user.id, is_alive]
    );

    if (spouse_id) {
      await pool.query('UPDATE tree_nodes SET spouse_id = $1 WHERE id = $2', [result.rows[0].id, spouse_id]);
    }

    await pool.query('INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'add_node', `Added: ${name}`, req.ip]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// PUT update node
router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { id } = req.params;
  const name = req.body.name;
  const parent_id = toNull(req.body.parent_id) ? parseInt(req.body.parent_id) : null;
  const spouse_id = toNull(req.body.spouse_id) ? parseInt(req.body.spouse_id) : null;
  const birth_date = yearToDate(req.body.birth_date);
  const death_date = yearToDate(req.body.death_date);
  const father_name = toNull(req.body.father_name);
  const mother_name = toNull(req.body.mother_name);
  const wife_name = toNull(req.body.wife_name);
  const urdu_name = toNull(req.body.urdu_name);
  const info = toNull(req.body.info);
  const photo = req.file ? req.file.filename : undefined;

  let is_alive;
  if (req.body.is_alive !== undefined) {
    is_alive = req.body.is_alive === 'true' || req.body.is_alive === true;
  } else {
    is_alive = !death_date;
  }
  const final_death_date = is_alive ? null : death_date;

  if (!name) return res.status(400).json({ msg: 'Name is required' });

  try {
    let query = `UPDATE tree_nodes SET name=$1, parent_id=$2, spouse_id=$3, birth_date=$4, death_date=$5,
                 father_name=$6, mother_name=$7, wife_name=$8, urdu_name=$9, info=$10, is_alive=$11`;
    const values = [name, parent_id, spouse_id, birth_date, final_death_date, father_name, mother_name, wife_name, urdu_name, info, is_alive];

    if (photo) {
      query += ', photo=$12 WHERE id=$13 RETURNING *';
      values.push(photo, id);
    } else {
      query += ' WHERE id=$12 RETURNING *';
      values.push(id);
    }

    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ msg: 'Node not found' });

    if (spouse_id) {
      await pool.query('UPDATE tree_nodes SET spouse_id = $1 WHERE id = $2', [id, spouse_id]);
    }

    await pool.query('INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'update_node', `Updated node ${id}`, req.ip]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// DELETE node
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { id } = req.params;
  try {
    const node = await pool.query('SELECT name, spouse_id FROM tree_nodes WHERE id=$1', [id]);
    if (node.rowCount === 0) return res.status(404).json({ msg: 'Node not found' });

    if (node.rows[0].spouse_id) {
      await pool.query('UPDATE tree_nodes SET spouse_id = NULL WHERE id = $1', [node.rows[0].spouse_id]);
    }

    await pool.query('DELETE FROM tree_nodes WHERE id=$1', [id]);
    await pool.query('INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'delete_node', `Deleted: ${node.rows[0].name}`, req.ip]);

    res.json({ msg: 'Node deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

module.exports = router;