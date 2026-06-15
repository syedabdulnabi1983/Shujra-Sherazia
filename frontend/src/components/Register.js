import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, InputAdornment, IconButton, Box } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Register = () => {
  const [form, setForm] = useState({
    name: '', email: '', login_id: '', password: '', re_password: '', secret_code: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (form.password !== form.re_password) {
      setMsg('Passwords do not match');
      return;
    }
    try {
      const res = await axios.post('/api/auth/register', form);
      localStorage.setItem('token', res.data.token);
      setSuccess(true);
      setMsg('');
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err) {
      setMsg(err.response?.data?.msg || 'Registration failed');
    }
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', py: 4 }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
          <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 700, color: '#2E7D32' }}>Member Registration</Typography>
          {msg && <Typography color="error" align="center" sx={{ mb: 2 }}>{msg}</Typography>}
          {success && <Typography color="success.main" align="center" sx={{ mb: 2 }}>Registration successful! Redirecting...</Typography>}
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Full Name" name="name" margin="normal" value={form.name} onChange={handleChange} required />
            <TextField fullWidth label="Email" name="email" type="email" margin="normal" value={form.email} onChange={handleChange} required />
            <TextField fullWidth label="Login ID" name="login_id" margin="normal" value={form.login_id} onChange={handleChange} required />
            <TextField fullWidth label="Password" name="password" type={showPassword ? 'text' : 'password'} margin="normal" value={form.password} onChange={handleChange} required
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
            />
            <TextField fullWidth label="Re-enter Password" name="re_password" type={showRePassword ? 'text' : 'password'} margin="normal" value={form.re_password} onChange={handleChange} required
              InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowRePassword(!showRePassword)}>{showRePassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
            />
            <TextField fullWidth label="Secret Code" name="secret_code" margin="normal" value={form.secret_code} onChange={handleChange} required helperText="Enter the code provided by admin to register as member." />
            <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, mb: 1, bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}>Register</Button>
          </form>
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Link to="/login" style={{ color: '#2E7D32' }}>Already have an account? Login</Link>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Register;