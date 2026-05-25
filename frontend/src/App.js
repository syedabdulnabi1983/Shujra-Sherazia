import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import axios from 'axios';
import TreeView from './components/TreeView';

axios.defaults.baseURL = 'http://localhost:5001/api';
axios.defaults.withCredentials = true;

const inputStyle = {
    width: '100%',
    padding: '12px',
    marginBottom: '14px',
    border: '1px solid #ddd',
    borderRadius: '5px',
};

const primaryButtonStyle = {
    width: '100%',
    padding: '12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
};

const secondaryButtonStyle = {
    width: '100%',
    marginTop: '12px',
    padding: '10px',
    background: 'white',
    color: '#667eea',
    border: '1px solid #667eea',
    borderRadius: '5px',
    cursor: 'pointer',
};

function TreeViewWrapper() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        async function checkAuth() {
            try {
                const res = await axios.get('/auth/me');
                if (res.data) {
                    setIsLoggedIn(true);
                    setUser(res.data);
                    localStorage.setItem('role', res.data.role);
                    localStorage.setItem('user', JSON.stringify(res.data));
                }
            } catch (err) {
                setIsLoggedIn(false);
                navigate('/login');
            } finally {
                setLoading(false);
            }
        }

        checkAuth();
    }, [navigate]);

    const handleLogout = async () => {
        await axios.post('/auth/logout');
        setIsLoggedIn(false);
        setUser(null);
        localStorage.clear();
        navigate('/login');
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    }

    if (!isLoggedIn) {
        return <Navigate to="/login" />;
    }

    return <TreeView user={user} onLogout={handleLogout} />;
}

function AuthShell({ children }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '24px',
        }}>
            {children}
        </div>
    );
}

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const res = await axios.post('/auth/login', { email, password });
            if (res.data.success) {
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('role', res.data.user.role);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        }
    };

    return (
        <AuthShell>
            <form onSubmit={handleSubmit} style={{
                background: 'white',
                padding: '40px',
                borderRadius: '10px',
                width: '350px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>Shujra Sherazia</h2>
                {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={inputStyle}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={inputStyle}
                    required
                />

                <button type="submit" style={primaryButtonStyle}>Login</button>
                <button type="button" onClick={() => navigate('/register')} style={secondaryButtonStyle}>
                    Member Registration
                </button>
            </form>
        </AuthShell>
    );
}

function RegisterPage() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        repeatPassword: '',
        code: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleChange = (field, value) => {
        setForm({ ...form, [field]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            await axios.post('/auth/register', form);
            setSuccess('Registration successful. Ab login kar sakte hain.');
            window.setTimeout(() => navigate('/login'), 900);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        }
    };

    return (
        <AuthShell>
            <form onSubmit={handleSubmit} style={{
                background: 'white',
                padding: '36px',
                borderRadius: '10px',
                width: '390px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#333' }}>Member Registration</h2>
                {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}
                {success && <p style={{ color: 'green', textAlign: 'center', marginBottom: '15px' }}>{success}</p>}

                <input type="text" placeholder="Name" value={form.name} onChange={(e) => handleChange('name', e.target.value)} style={inputStyle} required />
                <input type="email" placeholder="User ID / Email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} style={inputStyle} required />
                <input type="password" placeholder="Password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} style={inputStyle} required />
                <input type="password" placeholder="Repeat Password" value={form.repeatPassword} onChange={(e) => handleChange('repeatPassword', e.target.value)} style={inputStyle} required />
                <input type="text" placeholder="Registration Code" value={form.code} onChange={(e) => handleChange('code', e.target.value)} style={inputStyle} required />

                <button type="submit" style={primaryButtonStyle}>Register</button>
                <button type="button" onClick={() => navigate('/login')} style={secondaryButtonStyle}>Back to Login</button>
            </form>
        </AuthShell>
    );
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<TreeViewWrapper />} />
                <Route path="/tree/:khandanId" element={<TreeViewWrapper />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
