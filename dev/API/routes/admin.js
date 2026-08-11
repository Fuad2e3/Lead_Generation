const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// @route   GET  /api/admin/users        → Get all users
router.get('/users', adminController.getAllUsers);

// @route   PATCH /api/admin/users/:id/status → Update user status (Supports POST as well)
router.patch('/users/:id/status', adminController.updateUserStatus);
router.post('/users/:id/status', adminController.updateUserStatus);

// @route   DELETE /api/admin/users/:id  → Delete a user (Supports POST as well)
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/delete', adminController.deleteUser);

// @route   PATCH /api/admin/users/:id/reset → Reset violations (Supports POST as well)
router.patch('/users/:id/reset', adminController.resetViolations);
router.post('/users/:id/reset', adminController.resetViolations);

// @route   POST /api/admin/users/:id/package → Update user package & daily credits
router.patch('/users/:id/package', adminController.updateUserPackage);
router.post('/users/:id/package', adminController.updateUserPackage);

// @route   GET & POST /api/admin/announcement → System Announcement
router.get('/announcement', adminController.getAnnouncement);
router.post('/announcement', adminController.updateAnnouncement);

// @route   GET /api/admin/activity-logs → System Activity Audit Logs
router.get('/activity-logs', adminController.getActivityLogs);

module.exports = router;
