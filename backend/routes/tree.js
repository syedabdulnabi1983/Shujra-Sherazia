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

const yearToDate = (val) => {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (trimmed === '' || /^0+$/.test(trimmed)) return null;
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`;
  return null;
};

// ─── GET ───
router.get('/', async (req, res) => {
  try {
    // Only fetch records where source = 'tree_nodes' (Sherazia family)
    const result = await pool.query(`
      SELECT 
        n.*,
        f.name AS father_name_db,
        s.name AS spouse_name_db,
        s.id AS spouse_node_id
      FROM family_tree n
      LEFT JOIN family_tree f ON n.parent_id = f.id
      LEFT JOIN family_tree s ON n.spouse_id = s.id
      WHERE n.source = 'tree_nodes'
      ORDER BY n.generation_number, n.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─── POST ───
router.post('/', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'member' && req.user.role !== 'admin')
    return res.status(403).json({ msg: 'Access denied' });

  const { name, parent_id, spouse_id, father_name, mother_name, wife_name,
          urdu_name, info, birth_date, death_date, is_alive } = req.body;
  const photo = req.file ? req.file.filename : null;

  const finalParentId = toNull(parent_id) ? parseInt(parent_id) : null;
  const finalSpouseId = toNull(spouse_id) ? parseInt(spouse_id) : null;
  const finalBirthDate = yearToDate(birth_date);
  let finalDeathDate = yearToDate(death_date);

  let alive;
  if (req.body.is_alive !== undefined) {
    alive = req.body.is_alive === 'true' || req.body.is_alive === true;
  } else {
    alive = !finalDeathDate;
  }
  if (alive) finalDeathDate = null;

  if (!name) return res.status(400).json({ msg: 'Name is required' });

  try {
    const result = await pool.query(
      `INSERT INTO family_tree (name, parent_id, spouse_id, birth_date, death_date,
       father_name, mother_name, wife_name, urdu_name, info, photo, added_by, is_alive, source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'tree_nodes') RETURNING *`,
      [name, finalParentId, finalSpouseId, finalBirthDate, finalDeathDate,
       toNull(father_name), toNull(mother_name), toNull(wife_name),
       toNull(urdu_name), toNull(info), photo, req.user.id, alive]
    );

    if (finalSpouseId) {
      await pool.query('UPDATE family_tree SET spouse_id = $1 WHERE id = $2',
                       [result.rows[0].id, finalSpouseId]);
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'add_node', `Added: ${name}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// ─── PUT ───
router.put('/:id', auth, upload.single('photo'), async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

  const { id } = req.params;
  const { name, parent_id, spouse_id, father_name, mother_name, wife_name,
          urdu_name, info, birth_date, death_date, is_alive } = req.body;
  const photo = req.file ? req.file.filename : undefined;

  const finalParentId = toNull(parent_id) ? parseInt(parent_id) : null;
  const finalSpouseId = toNull(spouse_id) ? parseInt(spouse_id) : null;
  const finalBirthDate = yearToDate(birth_date);
  let finalDeathDate = yearToDate(death_date);

  let alive;
  if (req.body.is_alive !== undefined) {
    alive = req.body.is_alive === 'true' || req.body.is_alive === true;
  } else {
    alive = !finalDeathDate;
  }
  if (alive) finalDeathDate = null;

  if (!name) return res.status(400).json({ msg: 'Name is required' });

  try {
    let query = `UPDATE family_tree SET name=$1, parent_id=$2, spouse_id=$3,
                 birth_date=$4, death_date=$5, father_name=$6, mother_name=$7,
                 wife_name=$8, urdu_name=$9, info=$10, is_alive=$11`;
    const values = [name, finalParentId, finalSpouseId, finalBirthDate, finalDeathDate,
                    toNull(father_name), toNull(mother_name), toNull(wife_name),
                    toNull(urdu_name), toNull(info), alive];

    if (photo) {
      query += ', photo=$12 WHERE id=$13 RETURNING *';
      values.push(photo, id);
    } else {
      query += ' WHERE id=$12 RETURNING *';
      values.push(id);
    }

    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ msg: 'Node not found' });

    if (finalSpouseId) {
      await pool.query('UPDATE family_tree SET spouse_id = $1 WHERE id = $2', [id, finalSpouseId]);
    }

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'update_node', `Updated node ${id}`, req.ip]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

// ─── DELETE ───
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
  const { id } = req.params;
  try {
    const node = await pool.query('SELECT name, spouse_id FROM family_tree WHERE id=$1', [id]);
    if (node.rowCount === 0) return res.status(404).json({ msg: 'Node not found' });

    if (node.rows[0].spouse_id) {
      await pool.query('UPDATE family_tree SET spouse_id = NULL WHERE id = $1', [node.rows[0].spouse_id]);
    }

    await pool.query('DELETE FROM family_tree WHERE id=$1', [id]);
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, description, ip_address) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'delete_node', `Deleted: ${node.rows[0].name}`, req.ip]
    );
    res.json({ msg: 'Node deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Database error' });
  }
});

module.exports = router;