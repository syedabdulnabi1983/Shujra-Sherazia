import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Typography } from '@mui/material';
import TreeView from './components/TreeView';
import Login from './components/Login';
import Register from './components/Register';
import RegisterAdmin from './components/RegisterAdmin';
import AdminPanel from './components/AdminPanel';
import History from './components/History';
import AdamToMuhammad from './components/AdamToMuhammad';
import AliToSherazi from './components/AliToSherazi';
import Thanks from './components/Thanks';
import Contact from './components/Contact';
import HomePage from './components/HomePage';
import setAuthToken from './utils/setAuthToken';
import { jwtDecode } from 'jwt-decode';

const pageTitles = {
  '/': 'صفحۂ اول',
  '/tree': 'شجرۂ نسب',
  '/history': 'تاریخ',
  '/adam-to-muhammad': 'حضرت آدم (ع) تا حضرت محمد مصطفیٰ ﷺ',
  '/ali-to-sherazi': 'حضرت علی (ع) تا شیرازی',
  '/thanks': 'خصوصی شکریہ',
  '/contact': 'رابطہ',
  '/login': 'لاگ ان',
  '/register': 'رجسٹر',
  '/register-admin': 'ایڈمن رجسٹریشن',
  '/admin': 'ایڈمن پینل',
};

function AppContent() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
        } else {
          setUser({ id: decoded.id, email: decoded.email, role: decoded.role, is_master: decoded.is_master });
          setAuthToken(token);
        }
      } catch (e) { localStorage.removeItem('token'); }
    }
  }, []);

  const logout = () => { localStorage.removeItem('token'); setUser(null); window.location.href = '/'; };

  const currentTitle = pageTitles[location.pathname] || 'شجرۂ شیرازیہ';
  const isAdmin = user && user.role === 'admin';

  return (
    <div className="app-shell">
      {/* Bismillah Header */}
      <div className="bismillah-header">
        <h2>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</h2>
      </div>

      {/* Salwat (Durood) */}
      <div style={{ background: '#1B5E20', textAlign: 'center', padding: '6px 0', borderBottom: '2px solid #FDD835' }}>
        <Typography variant="body1" sx={{ color: '#FDD835', fontFamily: 'Noto Nastaliq Urdu, serif', fontSize: '18px' }}>
          صَلُّوا عَلَى النَّبِيِّ مُحَمَّدٍ ﷺ
        </Typography>
      </div>

      {/* 🆕 Dua Added here – Just below Salwat */}
      <div style={{ background: '#1B5E20', textAlign: 'center', padding: '6px 0', borderBottom: '2px solid #FDD835' }}>
        <Typography variant="body1" sx={{ color: '#FDD835', fontFamily: 'Noto Nastaliq Urdu, serif', fontSize: '14px' }}>
          رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا
        </Typography>
      </div>

      <nav className="navbar-custom">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <svg width="34" height="34" viewBox="0 0 36 36" className="brand-logo">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#FDD835" strokeWidth="2.5"/>
              <path d="M18 3 L18 33 M18 3 C10 10 10 26 18 33 M18 3 C26 10 26 26 18 33" fill="none" stroke="#FDD835" strokeWidth="2"/>
              <circle cx="18" cy="18" r="5" fill="#FDD835"/>
            </svg>
            <span className="brand-text">شیرازیہ</span>
          </Link>
          <div className="navbar-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>ہوم</Link>
            <Link to="/tree" className={`nav-link ${location.pathname === '/tree' ? 'active' : ''}`}>شجرہ</Link>
            <Link to="/history" className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}>تاریخ</Link>
            <Link to="/adam-to-muhammad" className={`nav-link ${location.pathname === '/adam-to-muhammad' ? 'active' : ''}`}>آدم تا محمد ﷺ</Link>
            <Link to="/ali-to-sherazi" className={`nav-link ${location.pathname === '/ali-to-sherazi' ? 'active' : ''}`}>علی تا شیرازی</Link>
            <Link to="/thanks" className={`nav-link ${location.pathname === '/thanks' ? 'active' : ''}`}>شکریہ</Link>
            <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>رابطہ</Link>
            {isAdmin && <Link to="/admin" className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}>ایڈمن</Link>}
          </div>
          <div className="navbar-user">
            {!user ? (
              <>
                <Link to="/login" className="nav-link">لاگ ان</Link>
                <Link to="/register" className="nav-link">رجسٹر</Link>
                <Link to="/register-admin" className="nav-link" style={{ border: '1px solid #FDD835', color: '#FDD835' }}>ایڈمن رجسٹر</Link>
              </>
            ) : (
              <div className="user-menu">
                <span className="user-email">{user.email} ({user.role})</span>
                <button onClick={logout} className="logout-btn">لاگ آؤٹ</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="page-heading"><h1>{currentTitle}</h1></div>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tree" element={<TreeView user={user} />} />
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/register-admin" element={!user ? <RegisterAdmin /> : <Navigate to="/" />} />
          <Route path="/history" element={<History />} />
          <Route path="/adam-to-muhammad" element={<AdamToMuhammad user={user} />} />
          <Route path="/ali-to-sherazi" element={<AliToSherazi user={user} />} />
          <Route path="/thanks" element={<Thanks />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <AdminPanel user={user} /> : <Navigate to="/" />} />
        </Routes>
      </div>

      {/* Footer – remaining only copyright */}
      <div className="footer">
        <Typography variant="body2" sx={{ color: '#FDD835' }}>
          © {new Date().getFullYear()} شیرازیہ فیملی ٹری۔ جملہ حقوق محفوظ ہیں۔
        </Typography>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
}

export default App;