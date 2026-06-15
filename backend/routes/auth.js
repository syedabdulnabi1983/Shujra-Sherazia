const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Register member
router.post('/register', async (req, res) => {
  const { name, email, login_id, password, re_password, secret_code } = req.body;
  if (password !== re_password) return res.status(400).json({ msg: 'Passwords do not match' });

  try {
    const codeRes = await pool.query("SELECT value FROM settings WHERE key='registration_secret_code'");
    if (codeRes.rows.length === 0) return res.status(500).json({ msg: 'Server configuration error' });
    if (secret_code !== codeRes.rows[0].value) return res.status(400).json({ msg: 'Invalid secret code' });

    const exist = await pool.query('SELECT id FROM users WHERE email=$1 OR login_id=$2', [email, login_id]);
    if (exist.rowCount > 0) return res.status(400).json({ msg: 'User exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, login_id, password, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role, is_master',
      [name, email, login_id, hashed, 'member']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, is_master: user.is_master }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, is_master: user.is_master } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rowCount === 0) return res.status(400).json({ msg: 'Invalid credentials' });
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, is_master: user.is_master },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, is_master: user.is_master } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Register admin
router.post('/register-admin', async (req, res) => {
  const { name, email, login_id, password, re_password, admin_code } = req.body;
  if (password !== re_password) return res.status(400).json({ msg: 'Passwords do not match' });

  try {
    const codeRes = await pool.query("SELECT value FROM settings WHERE key='admin_registration_code'");
    if (codeRes.rows.length === 0) return res.status(500).json({ msg: 'Server configuration error' });
    if (admin_code !== codeRes.rows[0].value) return res.status(400).json({ msg: 'Invalid admin registration code' });

    const exist = await pool.query('SELECT id FROM users WHERE email=$1 OR login_id=$2', [email, login_id]);
    if (exist.rowCount > 0) return res.status(400).json({ msg: 'User exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, login_id, password, role, is_master) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role, is_master',
      [name, email, login_id, hashed, 'admin', false]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, is_master: user.is_master }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, is_master: user.is_master } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;