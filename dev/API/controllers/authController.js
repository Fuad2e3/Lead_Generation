const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// start register function
// Controller for user registration. Validates input, hashes the password using bcrypt, and inserts the new user into the database.
exports.register = (req, res) => {
  const { name, email, password } = req.body;
  console.log('Register attempt:', email);

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required!' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters!' });
  }

  bcrypt.hash(password, 10, (err, hashed) => {
    if (err) {
      console.error('Bcrypt Hash Error:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    db.query(
      'INSERT INTO users (name, email, password, status, rate_limit_violations) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashed, 'active', 0],
      (err, result) => {
        if (err) {
          console.error('Insert Error:', err.message);
          return res.status(500).json({ success: false, message: 'Registration failed! Email might already exist.' });
        }
        console.log('User saved! ID:', result.insertId);
        const token = jwt.sign(
          { id: result.insertId },
          process.env.JWT_SECRET || 'fallback_secret',
          { expiresIn: '30d' }
        );
        res.json({
          success: true,
          message: 'Registration successful!',
          token: token,
          user: { id: result.insertId, name: name, email: email, status: 'active' }
        });
      }
    );
  });
};
// end register function

// start login function
// Controller for user login. Validates credentials, checks account status (active, inactive, or banned), handles 30-day inactivity, compares password hashes, and generates a JWT token on success.
exports.login = (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email);

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required!' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, rows) => {
    if (err) {
      console.error('Database Select Error:', err.message);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found!' });
    }

    const user = rows[0];

    // Check for 30-day inactivity (Auto-Inactive)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (user.last_login && new Date(user.last_login) < thirtyDaysAgo && user.status === 'active') {
      db.query("UPDATE users SET status = 'inactive' WHERE id = ?", [user.id], (err) => {
        if (err) console.error('DB Update Error (Inactivity):', err.message);
      });
      user.status = 'inactive'; // Update local object for check below
      console.log(`User ${user.email} set to INACTIVE due to 30-day inactivity.`);
    }

    // Check Account Status
    if (user.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your account has been banned!' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account is inactive!' });
    }

    bcrypt.compare(password, user.password, (err, valid) => {
      if (err) {
        console.error('Bcrypt Compare Error:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }

      if (!valid) {
        return res.status(401).json({ success: false, message: 'Wrong password!' });
      }

      // Update Last Login and reset violations
      db.query('UPDATE users SET last_login = NOW(), rate_limit_violations = 0 WHERE id = ?', [user.id], (err) => {
        if (err) console.error('DB Update Error (Login Success):', err.message);
      });

      const token = jwt.sign(
        { id: rows[0].id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '30d' }
      );

      console.log('Login success:', email);
      logActivity(user.id, user.email, 'LOGIN', 'User logged in successfully');
      res.json({
        success: true,
        token: token,
        user: { id: user.id, name: user.name, email: user.email, status: user.status }
      });
    });
  });
};
// end login function

// Helper to record activity log
function logActivity(userId, userEmail, action, details) {
  const sql = 'INSERT INTO activity_logs (user_id, user_email, action, details) VALUES (?, ?, ?, ?)';
  db.query(sql, [userId || null, userEmail || 'System', action, details || ''], (err) => {
    if (err) console.error('[ActivityLog] Error:', err.message);
  });
}

// start checkStatus function
// Checks user account status, resets 24-hour daily credits if needed, and returns credit info + system announcement.
exports.checkStatus = (req, res) => {
  const { email, id } = req.body;
  if (!email && !id) {
    return res.status(400).json({ success: false, message: 'Email or ID required.' });
  }

  const query = id
    ? 'SELECT id, name, email, status, package, daily_credits, used_credits_today, last_credit_reset FROM users WHERE id = ?'
    : 'SELECT id, name, email, status, package, daily_credits, used_credits_today, last_credit_reset FROM users WHERE email = ?';
  const param = id || email;

  db.query(query, [param], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (rows.length === 0) {
      return res.json({ success: false, status: 'deleted', message: 'Your account has been deleted by an administrator.' });
    }

    let user = rows[0];
    if (user.status === 'banned') {
      return res.json({ success: false, status: 'banned', message: 'Your account has been banned by an administrator.' });
    }

    if (user.status === 'inactive') {
      return res.json({ success: false, status: 'inactive', message: 'Your account is inactive.' });
    }

    // 24-Hour Credit Reset Check
    const now = new Date();
    const lastReset = user.last_credit_reset ? new Date(user.last_credit_reset) : new Date(0);
    const hoursDiff = (now - lastReset) / (1000 * 60 * 60);

    if (hoursDiff >= 24) {
      db.query('UPDATE users SET used_credits_today = 0, last_credit_reset = NOW() WHERE id = ?', [user.id]);
      user.used_credits_today = 0;
    }

    // Fetch active system announcement
    db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'announcement'", (err, annRows) => {
      const announcement = (!err && annRows.length > 0) ? annRows[0].setting_value : '';

      const remaining = Math.max(0, (user.daily_credits || 50) - (user.used_credits_today || 0));

      res.json({
        success: true,
        status: 'active',
        announcement: announcement,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          package: user.package || 'free',
          dailyCredits: user.daily_credits || 50,
          usedCreditsToday: user.used_credits_today || 0,
          remainingCredits: remaining
        }
      });
    });
  });
};
// end checkStatus function

// start deductCredits function
// Deducts used credits for mining session.
exports.deductCredits = (req, res) => {
  const { id, email, count } = req.body;
  const deductCount = parseInt(count, 10) || 1;

  const query = id ? 'SELECT * FROM users WHERE id = ?' : 'SELECT * FROM users WHERE email = ?';
  const param = id || email;

  db.query(query, [param], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];
    const remaining = Math.max(0, user.daily_credits - user.used_credits_today);

    if (remaining < deductCount) {
      return res.status(403).json({
        success: false,
        message: `Insufficient daily credits! You have ${remaining} credit(s) left. Upgrade to Pro for more!`,
        remaining: remaining
      });
    }

    const newUsed = user.used_credits_today + deductCount;
    db.query('UPDATE users SET used_credits_today = ? WHERE id = ?', [newUsed, user.id], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Credit deduction error' });

      logActivity(user.id, user.email, 'MINING_SESSION', `Mined ${deductCount} URL(s). Credits used today: ${newUsed}/${user.daily_credits}`);

      res.json({
        success: true,
        message: `Deducted ${deductCount} credit(s).`,
        remainingCredits: user.daily_credits - newUsed,
        usedCreditsToday: newUsed
      });
    });
  });
};
// end deductCredits function
