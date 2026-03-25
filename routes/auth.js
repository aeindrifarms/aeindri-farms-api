const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^\d{10}$/).withMessage('Valid 10-digit phone is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], ctrl.register);

router.post('/verify-otp',      ctrl.verifyOTP);
router.post('/resend-otp',      ctrl.resendOTP);
router.post('/login',           ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.put('/change-password',  protect, ctrl.changePassword);
router.get('/me',               protect, ctrl.getMe);
router.post('/logout',          protect, ctrl.logout);

module.exports = router;
