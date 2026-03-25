// controllers/authController.js
const User = require('../models/User');
const { validationResult } = require('express-validator');

// Helper: send token response
const sendToken = (user, statusCode, res, message) => {
  const token = user.generateToken();
  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id:         user._id,
      firstName:  user.firstName,
      lastName:   user.lastName,
      email:      user.email,
      phone:      user.phone,
      role:       user.role,
      isVerified: user.isVerified,
    },
  });
};

// ── REGISTER ─────────────────────────────────
// POST /api/auth/register
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { firstName, lastName, email, phone, password, receiveOffers } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { phone }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: existing.email === email ? 'Email already registered.' : 'Phone number already registered.',
      });
    }

    const user = await User.create({ firstName, lastName, email, phone, password, receiveOffers });

    // Generate & (in production) send OTP
    const otp = user.generateOTP();
    await user.save();

    // TODO: await sendOTP(phone, otp); // Twilio integration

    console.log(`📱 OTP for ${phone}: ${otp}`); // Remove in production

    res.status(201).json({
      success: true,
      message: `OTP sent to +91${phone}. Please verify to complete registration.`,
      userId: user._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email or phone already exists.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── VERIFY OTP ────────────────────────────────
// POST /api/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId).select('+otp +otpExpiry');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (user.otp !== otp) return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    if (user.otpExpiry < Date.now()) return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });

    user.isVerified  = true;
    user.otpVerified = true;
    user.otp         = undefined;
    user.otpExpiry   = undefined;
    await user.save();

    sendToken(user, 200, res, 'Phone verified successfully! Welcome to Aeindri Farms 🌿');
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── RESEND OTP ────────────────────────────────
// POST /api/auth/resend-otp
exports.resendOTP = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId).select('+otp +otpExpiry');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const otp = user.generateOTP();
    await user.save();

    // TODO: await sendOTP(user.phone, otp);
    console.log(`📱 New OTP for ${user.phone}: ${otp}`);

    res.json({ success: true, message: 'OTP resent successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── LOGIN ─────────────────────────────────────
// POST /api/auth/login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    }

    user.lastLogin = new Date();
    await user.save();

    sendToken(user, 200, res, 'Login successful! Welcome back 👋');
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET CURRENT USER ──────────────────────────
// GET /api/auth/me
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist', 'name emoji price');
  res.json({ success: true, user });
};

// ── FORGOT PASSWORD ───────────────────────────
// POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(404).json({ success: false, message: 'No account with that email.' });

    const otp = user.generateOTP();
    await user.save();

    // TODO: await sendEmail({ to: user.email, subject: 'Password Reset OTP', otp });
    console.log(`🔑 Password reset OTP for ${user.email}: ${otp}`);

    res.json({ success: true, message: 'Password reset OTP sent to your email.', userId: user._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── RESET PASSWORD ────────────────────────────
// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;
    const user = await User.findById(userId).select('+otp +otpExpiry +password');

    if (!user || user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    user.password  = newPassword;
    user.otp       = undefined;
    user.otpExpiry = undefined;
    await user.save();

    sendToken(user, 200, res, 'Password reset successfully!');
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CHANGE PASSWORD ───────────────────────────
// PUT /api/auth/change-password  [protected]
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── LOGOUT (client-side) ─────────────────────
// POST /api/auth/logout
exports.logout = (req, res) => {
  res.json({ success: true, message: 'Logged out successfully. Please clear token on client.' });
};
