import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Box, Card, CardContent, CardActionArea, Grid } from '@mui/material';

const Home = () => {
  return (
    <Box sx={{ height: '100%', overflowY: 'auto', background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)' }}>
      <Box sx={{ textAlign: 'center', py: 8, background: 'linear-gradient(135deg, #1B5E20, #2E7D32)', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 'auto', opacity: 0.25 }}>
          <path d="M0,200 L0,80 Q180,20 360,60 Q540,100 720,40 Q900,-20 1080,50 Q1260,120 1440,70 L1440,200 Z" fill="#FDD835" />
          <rect x="680" y="10" width="40" height="60" fill="#FDD835" />
          <circle cx="700" cy="15" r="12" fill="#1B5E20" />
          <polygon points="690,20 710,20 700,5" fill="#FDD835" />
        </svg>
        <svg width="80" height="80" viewBox="0 0 100 100" style={{ marginBottom: 20 }}>
          <circle cx="40" cy="40" r="30" fill="#FDD835" />
          <circle cx="58" cy="30" r="24" fill="#1B5E20" />
          <polygon points="50,15 54,28 68,28 57,37 61,50 50,42 39,50 43,37 32,28 46,28" fill="#FDD835" />
        </svg>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>شجرۂ شیرازیہ</Typography>
        <Typography variant="h6" sx={{ mb: 2, fontStyle: 'italic', fontFamily: 'Noto Nastaliq Urdu, serif' }}>خاندان شیرازیہ کا شجرہ نسب</Typography>
        <Typography variant="body1" sx={{ maxWidth: 600, mx: 'auto', opacity: 0.9 }}>
          شیرازیہ خاندان کے شجرہ نسب میں خوش آمدید۔ یہ شجرہ حضرت آدم علیہ السلام سے لے کر انبیاء و اولیاء کرام کے واسطے سے حضرت سید محمد ملوک شاہ شیرازی رحمۃ اللہ علیہ اور ان کی اولاد تک پھیلا ہوا ہے۔
        </Typography>
      </Box>

      <Container sx={{ py: 6 }}>
        <Grid container spacing={3} justifyContent="center">
          {[
            { to: '/tree', title: 'شجرۂ نسب', desc: 'خاندانی شجرہ دیکھیں اور تلاش کریں', color: '#2E7D32' },
            { to: '/ali-to-sherazi', title: 'حضرت علی (ع) تا شیرازی', desc: 'روحانی سلسلہ', color: '#6A1B9A' },
            { to: '/adam-to-muhammad', title: 'حضرت آدم (ع) تا حضرت محمد ﷺ', desc: 'انبیاء کرام کا سلسلہ', color: '#F57F17' },
            { to: '/history', title: 'تاریخ', desc: 'ہمارے خاندان کی تاریخ جانیے', color: '#1565C0' },
            { to: '/contact', title: 'رابطہ', desc: 'ہم سے رابطہ کریں', color: '#C62828' },
            { to: '/thanks', title: 'خصوصی شکریہ', desc: 'جن کا ہم مشکور ہیں', color: '#00838F' },
          ].map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.to}>
              <Card sx={{ background: '#ffffffcc', backdropFilter: 'blur(10px)', borderRadius: 4, boxShadow: '0 8px 20px rgba(0,0,0,0.1)', transition: '0.3s', '&:hover': { boxShadow: '0 12px 30px rgba(0,0,0,0.2)', transform: 'translateY(-4px)' } }}>
                <CardActionArea component={Link} to={item.to}>
                  <Box sx={{ height: 6, background: item.color, borderRadius: '4px 4px 0 0' }} />
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: item.color, mb: 1 }}>{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.desc}</Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default Home;
