const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/error');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('\nJWT_SECRET is missing or too short. Copy .env.example to .env and set a long random JWT_SECRET.\n');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowed = (process.env.CLIENT_ORIGIN || `http://localhost:${PORT},http://127.0.0.1:${PORT},http://localhost:5500,http://127.0.0.1:5500`)
  .split(',').map((s) => s.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(cors({
  origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS'))),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'SAMEORIGIN'); next(); });

// API
app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/services', require('./routes/services'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/records', require('./routes/records'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api', notFound);

// Uploaded images + the frontend (served from the same origin so no CORS setup is needed)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use((req, res) => res.status(404).send('Page not found'));
app.use(errorHandler);

connectDB()
  .then(() => app.listen(PORT, () => console.log(`\nMeridian HMS running at http://localhost:${PORT}\n`)))
  .catch((err) => {
    console.error('\nCould not connect to MongoDB:', err.message);
    console.error('Make sure MongoDB is running (or set MONGODB_URI to your Atlas connection string in .env).\n');
    process.exit(1);
  });
