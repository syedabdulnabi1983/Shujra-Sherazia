const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const treeRoutes = require('./routes/tree');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tree', treeRoutes);

// Test Route
app.get('/', (req, res) => {
    res.send('Shujra-Sherazia API Chal Rahi Hai! 🌳');
});

// Server Start
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});