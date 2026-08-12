const express = require('express');
const authController = require('../controllers/authController');

module.exports = function(loginLimiter) {
  const router = express.Router();

  // @route   POST api/auth/register
  router.post('/register', authController.register);

  // @route   POST api/auth/login
  router.post('/login', loginLimiter ? loginLimiter : (req, res, next) => next(), authController.login);

  // @route   POST api/auth/check-status
  router.post('/check-status', authController.checkStatus);

  // @route   POST api/auth/deduct-credits
  router.post('/deduct-credits', authController.deductCredits);

  return router;
};
