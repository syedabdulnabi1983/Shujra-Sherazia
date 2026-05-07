import React, { useState, useEffect } from 'react';
import { Container, Grid, Card, CardContent, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Home() {
  const [khandans, setKhandans] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/tree/khandans')
      .then(res => setKhandans(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h3" align="center" gutterBottom>
        🌳 Shujra-Sherazia
      </Typography>
      <Typography variant="h5" align="center" color="textSecondary" gutterBottom>
        Apne Khandan ka Shajra Dekhein aur Banayein
      </Typography>
      
      <Box textAlign="center" mt={3} mb={5}>
        <Button variant="contained" component={Link} to="/login" size="large" sx={{ mr: 2 }}>
          Login
        </Button>
        <Button variant="outlined" component={Link} to="/register" size="large">
          Register
        </Button>
      </Box>

      <Typography variant="h4" gutterBottom>Maujooda Khandan:</Typography>
      <Grid container spacing={3}>
        {khandans.map(k => (
          <Grid item xs={12} sm={6} md={4} key={k.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{k.khandan_name}</Typography>
                <Typography color="textSecondary">Code: {k.khandan_code}</Typography>
                <Button 
                  component={Link} 
                  to={`/tree/${k.id}`} 
                  variant="contained" 
                  size="small" 
                  sx={{ mt: 1 }}
                >
                  Tree Dekhein
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

export default Home;