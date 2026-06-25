import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid, Avatar, Divider, Chip } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import axios from 'axios';

const Contact = () => {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    axios.get('/api/auth/contacts').then(res => setContacts(res.data)).catch(() => {});
  }, []);

  const members = contacts.filter(c => c.role === 'member');
  const admins = contacts.filter(c => c.role === 'admin');

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)', py: 4 }}>
      <Container maxWidth="md">
        <Typography variant="h4" align="center" sx={{ fontFamily: 'Noto Nastaliq Urdu, serif', color: '#1B5E20', fontWeight: 700, mb: 1 }}>
          ہم سے رابطہ کریں
        </Typography>
        <Typography align="center" sx={{ color: '#555', mb: 4 }}>
          کوئی سوال، تجویز یا معلومات کے لیے ہم سے رابطہ کریں
        </Typography>

        {/* Vendor */}
        <Paper elevation={4} sx={{ p: 3, borderRadius: 3, mb: 4, borderLeft: '6px solid #FDD835', background: '#1B5E20' }}>
          <Typography sx={{ fontFamily: 'Noto Nastaliq Urdu, serif', color: '#FDD835', fontWeight: 700, fontSize: '18px', mb: 1 }}>
            بانی و منتظم شجرہ شیرازیہ
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Avatar sx={{ bgcolor: '#FDD835', color: '#1B5E20', fontWeight: 700, width: 52, height: 52, fontSize: 22 }}>س</Avatar>
            <Box>
              <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>Syed Abdul Nabi Shah Sherazi</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <PhoneIcon sx={{ color: '#FDD835', fontSize: 18 }} />
                <Typography sx={{ color: '#FDD835', fontSize: '15px', fontWeight: 600 }}>03358196296</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <EmailIcon sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>syedabdulnabi1983@gmail.com</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <LocationOnIcon sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 18 }} />
                <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>پاکستان</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Admins */}
        {admins.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Divider sx={{ flex: 1 }} />
              <Chip label="ایڈمنز" sx={{ fontFamily: 'Noto Nastaliq Urdu, serif', bgcolor: '#1565C0', color: '#fff', fontWeight: 700 }} />
              <Divider sx={{ flex: 1 }} />
            </Box>
            <Grid container spacing={2}>
              {admins.map((c, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Paper elevation={2} sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #1565C0' }}>
                    <Avatar sx={{ bgcolor: '#1565C0', width: 44, height: 44 }}>{c.name[0]}</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: '#1565C0' }}>{c.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 15, color: '#555' }} />
                        <Typography variant="body2" sx={{ color: '#555' }}>{c.mobile}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Members */}
        {members.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Divider sx={{ flex: 1 }} />
              <Chip label="ممبران" sx={{ fontFamily: 'Noto Nastaliq Urdu, serif', bgcolor: '#2E7D32', color: '#fff', fontWeight: 700 }} />
              <Divider sx={{ flex: 1 }} />
            </Box>
            <Grid container spacing={2}>
              {members.map((c, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Paper elevation={2} sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #2E7D32' }}>
                    <Avatar sx={{ bgcolor: '#2E7D32', width: 44, height: 44 }}>{c.name[0]}</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, color: '#2E7D32' }}>{c.name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 15, color: '#555' }} />
                        <Typography variant="body2" sx={{ color: '#555' }}>{c.mobile}</Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {contacts.length === 0 && (
          <Typography align="center" sx={{ color: '#999', mt: 4, fontFamily: 'Noto Nastaliq Urdu, serif' }}>
            ابھی کوئی رابطہ معلومات دستیاب نہیں
          </Typography>
        )}
      </Container>
    </Box>
  );
};

export default Contact;
