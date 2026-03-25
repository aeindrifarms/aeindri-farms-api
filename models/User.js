// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');

const addressSchema = new mongoose.Schema({
  label:      { type: String, default: 'Home' }, // Home / Work / Other
  name:       { type: String, required: true },
  phone:      { type: String, required: true },
  line1:      { type: String, required: true },
  line2:      { type: String },
  city:       { type: String, required: true },
  state:      { type: String, required: true },
  pincode:    { type: String, required: true },
  isDefault:  { type: Boolean, default: false },
});

const userSchema = new mongoose.Schema({
  firstName:  { type: String, required: [true, 'First name is required'], trim: true },
  lastName:   { type: String, required: [true, 'Last name is required'], trim: true },
  email:      {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  phone:      { type: String, required: [true, 'Phone number is required'], unique: true, match: [/^\d{10}$/, 'Enter a valid 10-digit number'] },
  password:   { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
  role:       { type: String, enum: ['customer', 'admin'], default: 'customer' },
  isVerified: { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
  avatar:     { type: String, default: '' },
  addresses:  [addressSchema],

  // OTP fields
  otp:           { type: String, select: false },
  otpExpiry:     { type: Date,   select: false },
  otpVerified:   { type: Boolean, default: false },

  // Password reset
  resetToken:    { type: String, select: false },
  resetTokenExpiry: { type: Date, select: false },

  // Preferences
  receiveOffers: { type: Boolean, default: true },
  wishlist:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  lastLogin:  { type: Date },
}, { timestamps: true });

// ── HASH PASSWORD BEFORE SAVE ────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── COMPARE PASSWORD ─────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ── GENERATE JWT ─────────────────────────────
userSchema.methods.generateToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// ── GENERATE OTP ─────────────────────────────
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// ── VIRTUAL: full name ───────────────────────
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);
