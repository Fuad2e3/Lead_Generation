const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// 🔒 Admin Protection Middleware
const verifyAdmin = (req, res, next) => {
  const secret = req.headers['x-admin-secret'] || req.query.admin_secret;
  const expectedSecret = process.env.ADMIN_SECRET || 'admin_secret_123';
  if (secret === expectedSecret || (!process.env.ADMIN_SECRET && (req.hostname === 'localhost' || req.hostname === '127.0.0.1'))) {
    return next();
  }
  return res.status(401).json({ success: false, message: 'Unauthorized: Valid Admin Secret Required' });
};

// @route   GET  /api/admin/users        → Get all users
router.get('/users', verifyAdmin, adminController.getAllUsers);

// @route   PATCH /api/admin/users/:id/status → Update user status (Supports POST as well)
router.patch('/users/:id/status', verifyAdmin, adminController.updateUserStatus);
router.post('/users/:id/status', verifyAdmin, adminController.updateUserStatus);

// @route   DELETE /api/admin/users/:id  → Delete a user (Supports POST as well)
router.delete('/users/:id', verifyAdmin, adminController.deleteUser);
router.post('/users/:id/delete', verifyAdmin, adminController.deleteUser);

// @route   PATCH /api/admin/users/:id/reset → Reset violations (Supports POST as well)
router.patch('/users/:id/reset', verifyAdmin, adminController.resetViolations);
router.post('/users/:id/reset', verifyAdmin, adminController.resetViolations);

// @route   POST /api/admin/users/:id/package → Update user package & daily credits
router.patch('/users/:id/package', verifyAdmin, adminController.updateUserPackage);
router.post('/users/:id/package', verifyAdmin, adminController.updateUserPackage);

// @route   GET & POST /api/admin/announcement → System Announcement (GET public for banner, POST protected)
router.get('/announcement', adminController.getAnnouncement);
router.post('/announcement', verifyAdmin, adminController.updateAnnouncement);

// @route   GET /api/admin/activity-logs → System Activity Audit Logs
router.get('/activity-logs', verifyAdmin, adminController.getActivityLogs);

// @route   GET & POST /api/admin/upgrade-requests → Package Upgrade Requests
router.get('/upgrade-requests', verifyAdmin, adminController.getUpgradeRequests);
router.post('/upgrade-requests/:id/action', verifyAdmin, adminController.handleUpgradeRequest);

module.exports = router;

