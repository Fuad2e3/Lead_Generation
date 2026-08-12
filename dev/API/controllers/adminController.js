const db = require('../config/db');

// Helper to record activity log
function logActivity(userId, userEmail, action, details) {
  if (userId && !userEmail) {
    db.query('SELECT email FROM users WHERE id = ?', [userId], (err, rows) => {
      const email = (!err && rows.length > 0) ? rows[0].email : `User #${userId}`;
      const sql = 'INSERT INTO activity_logs (user_id, user_email, action, details) VALUES (?, ?, ?, ?)';
      db.query(sql, [userId, email, action, details || ''], (err) => {
        if (err) console.error('[ActivityLog] Error:', err.message);
      });
    });
  } else {
    const sql = 'INSERT INTO activity_logs (user_id, user_email, action, details) VALUES (?, ?, ?, ?)';
    db.query(sql, [userId || null, userEmail || 'System', action, details || ''], (err) => {
      if (err) console.error('[ActivityLog] Error:', err.message);
    });
  }
}

// start getAllUsers function
// Returns all users from the database with full package and credit details.
exports.getAllUsers = (req, res) => {
  const sql = `
    SELECT
      id,
      name,
      email,
      password,
      status,
      package,
      daily_credits,
      used_credits_today,
      last_credit_reset,
      rate_limit_violations,
      last_login,
      created_at
    FROM users
    ORDER BY id ASC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error('[Admin] DB Query Error:', err.message);
      return res.status(500).json({ success: false, message: 'Database error', error: err.message });
    }
    res.json({ success: true, total: rows.length, users: rows });
  });
};

// start updateUserStatus function
// Updates status (active/inactive/banned) of a specific user.
exports.updateUserStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['active', 'inactive', 'banned'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value.' });
  }

  db.query('UPDATE users SET status = ? WHERE id = ?', [status, id], (err, result) => {
    if (err) {
      console.error('[Admin] Status Update Error:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to update status.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    logActivity(id, '', 'UPDATE_STATUS', `User #${id} status changed to "${status}"`);
    res.json({ success: true, message: `User status updated to "${status}".` });
  });
};

// start updateUserPackage function
// Updates subscription package (free, pro, enterprise) and optional custom daily credits limit.
exports.updateUserPackage = (req, res) => {
  const { id } = req.params;
  const { package: pkg, customCredits } = req.body;

  const allowedPackages = ['free', 'pro', 'enterprise'];
  if (!allowedPackages.includes(pkg)) {
    return res.status(400).json({ success: false, message: 'Invalid package name.' });
  }

  // Calculate default daily credits if customCredits not explicitly provided
  let dailyCredits = parseInt(customCredits, 10);
  if (isNaN(dailyCredits) || dailyCredits <= 0) {
    if (pkg === 'free') dailyCredits = 50;
    else if (pkg === 'pro') dailyCredits = 1000;
    else if (pkg === 'enterprise') dailyCredits = 999999;
  }

  const sql = 'UPDATE users SET package = ?, daily_credits = ? WHERE id = ?';
  db.query(sql, [pkg, dailyCredits, id], (err, result) => {
    if (err) {
      console.error('[Admin] Package Update Error:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to update package.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    logActivity(id, '', 'UPDATE_PACKAGE', `User #${id} package set to "${pkg.toUpperCase()}" with ${dailyCredits} credits/day`);
    res.json({ success: true, message: `User package updated to "${pkg.toUpperCase()}" (${dailyCredits} credits/day).` });
  });
};

// start deleteUser function
// Deletes a user by ID.
exports.deleteUser = (req, res) => {
  const { id } = req.params;

  db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('[Admin] Delete Error:', err.message);
      return res.status(500).json({ success: false, message: 'Failed to delete user.' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    logActivity(id, '', 'DELETE_USER', `User #${id} deleted from system`);
    res.json({ success: true, message: 'User deleted successfully.' });
  });
};

// start resetViolations function
// Resets rate_limit_violations to 0 and resets used_credits_today.
exports.resetViolations = (req, res) => {
  const { id } = req.params;

  db.query(
    "UPDATE users SET rate_limit_violations = 0, used_credits_today = 0, status = 'active' WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error('[Admin] Reset Error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to reset user.' });
      }
      logActivity(id, '', 'RESET_USER', `User #${id} violations and used credits reset to 0`);
      res.json({ success: true, message: 'Violations and used credits reset successfully.' });
    }
  );
};

// start getAnnouncement function
// Gets system announcement message.
exports.getAnnouncement = (req, res) => {
  db.query("SELECT setting_value FROM system_settings WHERE setting_key = 'announcement'", (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB Error' });
    const message = rows.length > 0 ? rows[0].setting_value : '';
    res.json({ success: true, announcement: message });
  });
};

// start updateAnnouncement function
// Updates or clears system announcement message.
exports.updateAnnouncement = (req, res) => {
  const { message } = req.body;
  const sql = `
    INSERT INTO system_settings (setting_key, setting_value)
    VALUES ('announcement', ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
  `;
  db.query(sql, [message || ''], (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Failed to update announcement' });
    logActivity(null, 'Admin', 'UPDATE_ANNOUNCEMENT', message ? `Announcement set: "${message}"` : 'Announcement cleared');
    res.json({ success: true, message: 'System announcement updated!' });
  });
};

// start getActivityLogs function
// Gets latest 50 activity logs.
exports.getActivityLogs = (req, res) => {
  db.query('SELECT * FROM activity_logs ORDER BY id DESC LIMIT 50', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'DB Error' });
    res.json({ success: true, logs: rows });
  });
};
