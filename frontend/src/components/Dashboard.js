import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Card, CardContent, Grid, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Dashboard() {
  const [khandans, setKhandans] = useState([]);
  const [open, setOpen] = useState(false);
  const [newKhandan, setNewKhandan] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) return navigate('/login');
    axios.get('http://localhost:5000/api/tree/khandans')
      .then(res => setKhandans(res.data))
      .catch(err => console.log(err));
  }, [token, navigate]);

  const createKhandan = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/tree/khandan', 
        { khandan_name: newKhandan },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setKhandans([...khandans, res.data.khandan]);
      setOpen(false);
      setNewKhandan('');
    } catch (err) {
      alert(err.response?.data?.error || 'Error creating khandan');
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        Welcome, {localStorage.getItem('name')}!
      </Typography>
      <Button variant="contained" onClick={() => setOpen(true)} sx={{ mb: 3 }}>
        + Naya Khandan Banayein
      </Button>

      <Grid container spacing={3}>
        {khandans.map(k => (
          <Grid item xs={12} sm={6} md={4} key={k.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{k.khandan_name}</Typography>
                <Typography color="textSecondary">Code: {k.khandan_code}</Typography>
                <Button component={Link} to={`/tree/${k.id}`} variant="contained" size="small" sx={{ mt: 1, mr: 1 }}>
                  Tree Dekhein
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Naya Khandan Banayein</DialogTitle>
        <DialogContent>
          <TextField 
            fullWidth 
            label="Khandan Naam" 
            margin="normal" 
            value={newKhandan} 
            onChange={e => setNewKhandan(e.target.value)} 
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={createKhandan}>Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Dashboard;