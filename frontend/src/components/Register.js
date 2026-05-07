import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Paper, Alert, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'member' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/auth/register', form);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed!');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>Register</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={handleRegister}>
          <TextField fullWidth label="Name" margin="normal" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <TextField fullWidth label="Email" type="email" margin="normal" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <TextField fullWidth label="Phone (with country code)" margin="normal" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required />
          <TextField fullWidth label="Password" type="password" margin="normal" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <MenuItem value="member">Member</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>Register</Button>
        </form>
        <Typography align="center" sx={{ mt: 2 }}>
          <Link to="/login">Already have account? Login</Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Register;