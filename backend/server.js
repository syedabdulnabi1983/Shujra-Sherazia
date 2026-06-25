const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: [
    'https://shujrasherazia.netlify.app',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/ali-sherazia', require('./routes/aliSherazia'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tree', require('./routes/tree'));
app.use('/api/whole-data', require('./routes/wholeData'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/prophets', require('./routes/prophets'));
app.use('/api/merged-tree', require('./routes/mergedTree'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
