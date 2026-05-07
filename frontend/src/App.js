import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import TreeView from './components/TreeView';
import Home from './components/Home';
import Navbar from './components/Navbar';

const theme = createTheme({
  palette: {
    primary: { main: '#2E7D32' },
    secondary: { main: '#FF8F00' },
  },
  typography: {
    fontFamily: 'Urdu, Nastaliq, Arial',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/tree/:khandanId" element={<TreeView />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;