import React, { useState } from 'react';
import { Container, Paper, TextField, Button, Typography, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      window.location.href = '/';
    } catch (err) {
      setMsg(err.response?.data?.msg || 'Login failed');
    }
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h5" align="center" sx={{ mb: 3, fontWeight: 700, color: '#2E7D32' }}>Login</Typography>
        {msg && <Typography color="error" align="center" sx={{ mb: 2 }}>{msg}</Typography>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" type="email" margin="normal" value={email} onChange={e => setEmail(e.target.value)} required />
          <TextField fullWidth label="Password" type={showPassword ? 'text' : 'password'} margin="normal" value={password} onChange={e => setPassword(e.target.value)} required
            InputProps={{ endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)}>{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }}
          />
          <Button type="submit" variant="contained" fullWidth sx={{ mt: 3, mb: 1, bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}>Login</Button>
        </form>
        <Typography align="center" sx={{ mt: 2 }}>
          <Link to="/register" style={{ color: '#2E7D32' }}>Don't have an account? Register</Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Login;