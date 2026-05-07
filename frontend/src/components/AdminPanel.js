import React, { useState, useEffect } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button, Paper, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [resetOpen, setResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  useEffect(() => {
    if (!token || role !== 'admin') return navigate('/login');
    loadUsers();
    // eslint-disable-next-line
  }, []);

  const loadUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) { console.log(err); }
  };

  const deleteUser = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await axios.delete(`http://localhost:5000/api/admin/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        loadUsers();
      } catch (err) { alert('Error deleting user'); }
    }
  };

  const togglePassword = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openResetDialog = (user) => {
    setResetUser(user);
    setNewPassword('');
    setResetOpen(true);
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 3) {
      alert('Password kam se kam 3 characters hona chahiye');
      return;
    }
    try {
      // Direct register route use karte hain but as update
      await axios.post(`http://localhost:5000/api/auth/reset-password-direct`, 
        { userId: resetUser.id, newPassword: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Password reset successfully! Naya password: ' + newPassword);
      setResetOpen(false);
      loadUsers();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Admin Panel</Typography>
      <Typography variant="h6" gutterBottom>All Registered Users</Typography>
      
      <Paper sx={{ overflow: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Password Hash</TableCell>
              <TableCell>Reset</TableCell>
              <TableCell>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>
                  {visiblePasswords[user.id] ? user.password?.substring(0, 30) + '...' : '••••••••'}
                  <IconButton size="small" onClick={() => togglePassword(user.id)}>
                    {visiblePasswords[user.id] ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => openResetDialog(user)}>
                    <LockResetIcon fontSize="small" />
                  </IconButton>
                </TableCell>
                <TableCell>
                  {user.role !== 'admin' && (
                    <Button variant="contained" color="error" size="small" onClick={() => deleteUser(user.id)}>Delete</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <DialogTitle>
          Reset Password: {resetUser?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Email: {resetUser?.email}
          </Typography>
          <TextField 
            fullWidth 
            label="Naya Password" 
            type="text"
            margin="normal" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={resetPassword} color="primary">Reset Password</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default AdminPanel;