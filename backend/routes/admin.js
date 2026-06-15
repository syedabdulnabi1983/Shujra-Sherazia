const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

function masterOnly(req, res, next) {
  if (!req.user.is_master) return res.status(403).json({ msg: 'Only master admin can perform this action' });
  next();
}

// Member registration code
router.get('/settings/member-secret-code', auth, masterOnly, async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key='registration_secret_code'");
    res.json({ code: result.rows[0]?.value || '' });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

router.put('/settings/member-secret-code', auth, masterOnly, async (req, res) => {
  const { newCode } = req.body;
  if (!newCode) return res.status(400).json({ msg: 'New code required' });
  try {
    await pool.query("UPDATE settings SET value=$1, updated_at=CURRENT_TIMESTAMP WHERE key='registration_secret_code'", [newCode]);
    res.json({ msg: 'Member registration code updated' });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

// Admin registration code
router.get('/settings/admin-registration-code', auth, masterOnly, async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key='admin_registration_code'");
    res.json({ code: result.rows[0]?.value || '' });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

router.put('/settings/admin-registration-code', auth, masterOnly, async (req, res) => {
  const { newCode } = req.body;
  if (!newCode) return res.status(400).json({ msg: 'New code required' });
  try {
    await pool.query("UPDATE settings SET value=$1, updated_at=CURRENT_TIMESTAMP WHERE key='admin_registration_code'", [newCode]);
    res.json({ msg: 'Admin registration code updated' });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

// Users
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
  try {
    const query = req.user.is_master
      ? 'SELECT id, name, email, login_id, role, is_master, created_at, password FROM users ORDER BY id'
      : 'SELECT id, name, email, login_id, role, is_master, created_at FROM users ORDER BY id';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

// Delete user
router.delete('/users/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
  const { id } = req.params;
  try {
    const user = await pool.query('SELECT role, is_master FROM users WHERE id=$1', [id]);
    if (user.rowCount === 0) return res.status(404).json({ msg: 'User not found' });
    const target = user.rows[0];
    if (target.is_master) return res.status(400).json({ msg: 'Cannot delete master admin' });
    if (target.role === 'admin' && !req.user.is_master) return res.status(403).json({ msg: 'Only master admin can delete other admins' });

    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ msg: 'User deleted' });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

// Reset password
router.put('/users/:id/reset-password', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ msg: 'New password required' });
  try {
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, id]);
    res.json({ msg: 'Password reset' });
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

// Audit logs
router.get('/logs', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
  try {
    const result = await pool.query(
      `SELECT a.*, u.name as user_name 
       FROM audit_logs a 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;