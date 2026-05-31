const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS
app.use(cors());

// Body parser
app.use(express.json());

// Static folder for uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes - now inside 'routes' folder
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tree', require('./routes/tree'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/prophets', require('./routes/prophets'));
// ...

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));