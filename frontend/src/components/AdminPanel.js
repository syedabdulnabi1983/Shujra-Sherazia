import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, TextField, Box, Chip,
  IconButton, InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';

const AdminPanel = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [memberCode, setMemberCode] = useState('');
  const [newMemberCode, setNewMemberCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [newAdminCode, setNewAdminCode] = useState('');
  const [resetId, setResetId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const token = localStorage.getItem('token');
  const isMaster = user?.is_master;

  const fetchUsers = useCallback(async () => {
    const res = await axios.get('/api/admin/users', { headers: { 'x-auth-token': token } });
    setUsers(res.data);
  }, [token]);

  const fetchLogs = useCallback(async () => {
    const res = await axios.get('/api/admin/logs', { headers: { 'x-auth-token': token } });
    setLogs(res.data);
  }, [token]);

  const fetchCodes = useCallback(async () => {
    if (!isMaster) return;
    try {
      const [memberRes, adminRes] = await Promise.all([
        axios.get('/api/admin/settings/member-secret-code', { headers: { 'x-auth-token': token } }),
        axios.get('/api/admin/settings/admin-registration-code', { headers: { 'x-auth-token': token } }),
      ]);
      setMemberCode(memberRes.data.code);
      setAdminCode(adminRes.data.code);
    } catch (err) { console.error(err); }
  }, [isMaster, token]);

  useEffect(() => { fetchUsers(); fetchLogs(); fetchCodes(); }, [fetchUsers, fetchLogs, fetchCodes]);

  const saveCode = async (endpoint, newCode, setter) => {
    try {
      await axios.put(endpoint, { newCode }, { headers: { 'x-auth-token': token } });
      setter('');
      fetchCodes();
      alert('Code updated successfully');
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const resetPassword = async () => {
    if (!resetId || !newPassword) { alert('User ID and new password required'); return; }
    try {
      await axios.put(`/api/admin/users/${resetId}/reset-password`, { newPassword }, { headers: { 'x-auth-token': token } });
      setNewPassword(''); setResetId('');
      alert('Password reset successful');
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const deleteUser = async (id, name, isMasterUser) => {
    if (isMasterUser) { alert('Cannot delete master admin'); return; }
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`, { headers: { 'x-auth-token': token } });
      fetchUsers();
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#2E7D32' }}>
          Admin Panel {isMaster ? '(Master Admin)' : '(Admin)'}
        </Typography>

        {isMaster && (
          <>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Member Registration Code</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>Current Code: <strong>{memberCode}</strong></Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField size="small" value={newMemberCode} onChange={e => setNewMemberCode(e.target.value)} placeholder="New code" />
                <Button variant="contained" onClick={() => saveCode('/api/admin/settings/member-secret-code', newMemberCode, setNewMemberCode)}>Save</Button>
              </Box>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Admin Registration Code</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>Current Code: <strong>{adminCode}</strong></Typography>
              <Box display="flex" gap={2} alignItems="center">
                <TextField size="small" value={newAdminCode} onChange={e => setNewAdminCode(e.target.value)} placeholder="New code" />
                <Button variant="contained" onClick={() => saveCode('/api/admin/settings/admin-registration-code', newAdminCode, setNewAdminCode)}>Save</Button>
              </Box>
            </Paper>
          </>
        )}

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Reset User Password</Typography>
          <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
            <TextField size="small" value={resetId} onChange={e => setResetId(e.target.value)} placeholder="User ID" sx={{ width: 120 }} />
            <TextField
              size="small"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="New Password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ width: 200 }}
            />
            <Button variant="contained" onClick={resetPassword}>Reset</Button>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Users</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Login ID</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Master</TableCell>
                  {isMaster && <TableCell>Password (hashed)</TableCell>}
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.login_id || '-'}</TableCell>
                    <TableCell><Chip size="small" label={u.role} color={u.role === 'admin' ? 'primary' : 'default'} /></TableCell>
                    <TableCell>{u.is_master ? 'Yes' : 'No'}</TableCell>
                    {isMaster && <TableCell sx={{ maxWidth: 200, wordBreak: 'break-all', fontSize: '0.75rem' }}>{u.password || 'N/A'}</TableCell>}
                    <TableCell>
                      {!u.is_master && (isMaster || u.role !== 'admin') && (
                        <Button size="small" color="error" onClick={() => deleteUser(u.id, u.name, u.is_master)}>Delete</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Audit Logs</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    <TableCell>{log.user_name || log.user_id}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>{log.ip_address || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminPanel;