require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/config/db');

const app = express();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to MongoDB or Memory Server
connectDB();

// Ensure frontend build exists
const frontendDist = path.join(__dirname, '../frontend/dist');
const indexPath = path.join(frontendDist, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('⚡ Building frontend bundle for dev server...');
  try {
    execSync('npm run build --workspace=frontend', { stdio: 'inherit' });
    console.log('✅ Frontend build complete.');
  } catch (err) {
    console.error('❌ Frontend build failed:', err.message);
  }
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('trust proxy', 1);

// CORS configuration (allow browser client origins)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Rate limiter for API
const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: 'Too many requests, please try again later.' },
  validate: { xForwardedForHeader: false },
});
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/app-auth', require('./src/routes/appAuth'));
app.use('/api', require('./src/routes/checkins'));
app.use('/api', require('./src/routes/leaderboard'));
app.use('/api', require('./src/routes/appBookings'));
app.use('/api', require('./src/routes/announcements'));
app.use('/api', require('./src/routes/issues'));
app.use('/api', require('./src/routes/staffManagement'));
app.use('/api/public', require('./src/routes/public'));

// Serve uploaded images (announcements, avatars)
app.use('/uploads', express.static(uploadsDir));

// Serve compiled React frontend
app.use(express.static(frontendDist));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Fallback to React index.html for SPA routing
app.get(/^(?!\/api).*/, (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(503).send('Application is starting up... Please refresh in a few seconds.');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err.stack || err.message);
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 IAC System & Mobile Hub running on port ${PORT}`);
});
