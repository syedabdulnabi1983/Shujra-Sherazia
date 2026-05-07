import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', res.data.user.role);
      localStorage.setItem('name', res.data.user.name);
      localStorage.setItem('userId', res.data.user.id);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed!');
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>Login</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={handleLogin}>
          <TextField fullWidth label="Email" margin="normal" value={email} onChange={e => setEmail(e.target.value)} required />
          <TextField fullWidth label="Password" type="password" margin="normal" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }}>Login</Button>
        </form>
        <Typography align="center" sx={{ mt: 2 }}>
          <Link to="/register">Register</Link> | <Link to="/forgot-password">Forgot Password?</Link>
        </Typography>
      </Paper>
    </Container>
  );
}

export default Login;