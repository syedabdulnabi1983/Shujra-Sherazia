import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
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
import setAuthToken from './utils/setAuthToken';
import { jwtDecode } from 'jwt-decode';

const pageTitles = {
  '/': 'Family Tree',
  '/history': 'History',
  '/adam-to-muhammad': 'Adam (A.S) to Muhammad (S.A.W)',
  '/ali-to-sherazi': 'Hazrat Ali (A.S) to Sherazi Sahib',
  '/thanks': 'Special Thanks',
  '/contact': 'Contact Us',
  '/login': 'Login',
  '/register': 'Register',
  '/register-admin': 'Admin Registration',
  '/admin': 'Admin Panel',
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
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/';
  };

  const currentTitle = pageTitles[location.pathname] || 'Family Tree';
  const isAdmin = user && user.role === 'admin';

  return (
    <div className="app-shell">
      {/* Bismillah Header */}
      <div className="bismillah-header">
        <h2>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</h2>
      </div>

      <nav className="navbar-custom">
        <div className="navbar-inner">
          <Link to="/" className="navbar-brand">
            <svg width="34" height="34" viewBox="0 0 36 36" className="brand-logo">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#FDD835" strokeWidth="2.5"/>
              <path d="M18 3 L18 33 M18 3 C10 10 10 26 18 33 M18 3 C26 10 26 26 18 33" fill="none" stroke="#FDD835" strokeWidth="2"/>
              <circle cx="18" cy="18" r="5" fill="#FDD835"/>
            </svg>
            <span className="brand-text">Sherazia</span>
          </Link>

          <div className="navbar-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Tree</Link>
            <Link to="/history" className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}>History</Link>
            <Link to="/adam-to-muhammad" className={`nav-link ${location.pathname === '/adam-to-muhammad' ? 'active' : ''}`}>Adam to Muhammad</Link>
            <Link to="/ali-to-sherazi" className={`nav-link ${location.pathname === '/ali-to-sherazi' ? 'active' : ''}`}>Ali to Sherazi</Link>
            <Link to="/thanks" className={`nav-link ${location.pathname === '/thanks' ? 'active' : ''}`}>Thanks</Link>
            <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>Contact</Link>
            {isAdmin && <Link to="/admin" className={`nav-link admin-link ${location.pathname === '/admin' ? 'active' : ''}`}>Admin</Link>}
          </div>

          <div className="navbar-user">
            {!user ? (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/register" className="nav-link">Register</Link>
                {/* ✅ Admin Registration Link added */}
                <Link to="/register-admin" className="nav-link" style={{ border: '1px solid #FDD835', color: '#FDD835' }}>Admin Registration</Link>
              </>
            ) : (
              <div className="user-menu">
                <span className="user-email">{user.email} ({user.role})</span>
                <button onClick={logout} className="logout-btn">Logout</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="page-heading">
        <h1>{currentTitle}</h1>
      </div>

      <div className="main-content">
        <Routes>
          <Route path="/" element={<TreeView user={user} />} />
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
    </div>
  );
}

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppContent />
    </Router>
  );
}

export default App;