const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware 
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Request-Private-Network');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(cors());

// Memory optimize 
app.use(express.json({ limit: '1mb' }));

// 🛡️ Enhanced Brute Force Protection
const db = require('./config/db'); // Database required for auto-ban
const loginAttempts = new Map();
// start loginLimiter function
// Middleware to prevent brute force attacks by limiting login attempts per IP. If limits are exceeded, it updates the user's violation count and may ban the account.
const loginLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const email = req.body.email;
  const now = Date.now();
  const limit = 5;
  const windowMs = 30 * 1000; // Reduced to 30 seconds

  console.log(`\n--- [RateLimit Check] --- IP: ${ip} | Email: ${email}`);

  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return next();
  }

  const data = loginAttempts.get(ip);

  // Reset if window expired
  if (now - data.lastAttempt > windowMs) {
    data.count = 1;
    data.lastAttempt = now;
    return next();
  }

  data.count++;
  data.lastAttempt = now;

  if (data.count > limit) {
    const retryAfter = Math.ceil((windowMs - (now - data.lastAttempt)) / 1000);

    // Auto-Ban Logic on Violation
    if (email) {
      db.query('SELECT rate_limit_violations FROM users WHERE email = ?', [email], (err, rows) => {
        if (!err && rows.length > 0) {
          const newViolations = rows[0].rate_limit_violations + 1;

          if (newViolations >= 2) {
            db.query("UPDATE users SET status = 'banned', rate_limit_violations = ? WHERE email = ?", [newViolations, email], (err) => {
              if (err) console.error('DB Update Error (Banning):', err.message);
              else console.log(`User ${email} BANNED due to repeated violations.`);
            });
          } else {
            db.query('UPDATE users SET rate_limit_violations = ? WHERE email = ?', [newViolations, email], (err) => {
              if (err) console.error('DB Update Error (Violation):', err.message);
              else console.log(`User ${email} violation count increased to ${newViolations}.`);
            });
          }
        }
      });
    }

    return res.status(429).json({
      success: false,
      message: `Too many attempts. Please try again in ${retryAfter || 30} seconds.`,
      retryAfter: retryAfter || 30
    });
  }

  next();
};
// end loginLimiter function


// Routes
app.use('/api/auth', require('./routes/auth')(loginLimiter));
app.use('/api/admin', require('./routes/admin'));   // Admin user management

// Serve static frontend files
// Local dev: files are in ../../ (project root)
// Railway: FRONTEND_PATH env var can override
const path = require('path');
const FRONTEND_DIR = process.env.FRONTEND_PATH
  ? path.resolve(process.env.FRONTEND_PATH)
  : path.join(__dirname, '..', '..');
app.use(express.static(FRONTEND_DIR));

// Health check endpoint (Railway uses this)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root → login page
app.get('/', (req, res) => {
  const loginPage = path.join(FRONTEND_DIR, 'login.html');
  res.sendFile(loginPage, (err) => {
    if (err) res.json({ message: 'API is running! Frontend files not found in this environment.' });
  });
});

const PORT = process.env.PORT || 3000;
const os = require('os');
app.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  let localIP = 'localhost';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) { localIP = net.address; break; }
    }
  }
  console.log('\n========================================');
  console.log(`  ✅ Server running!`);
  console.log(`  💻 Local:   http://localhost:${PORT}/`);
  console.log(`  🌐 Network: http://${localIP}:${PORT}/`);
  console.log(`  📱 Share the Network URL with other devices!`);
  console.log('========================================\n');
});
