// ═══════════════════════════════════════════════
//  AEINDRI FARMS — Main Server  (Production Ready)
//  server.js
// ═══════════════════════════════════════════════
const express   = require('express');
const mongoose  = require('mongoose');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ── SECURITY ─────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS ─────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(u => u.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow server-to-server
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    callback(new Error('CORS: origin not allowed → ' + origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ── RATE LIMITING ────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { success:false, message:'Too many requests. Try again later.' },
}));
app.use('/api/auth/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success:false, message:'Too many auth attempts. Try again later.' },
}));

// ── BODY PARSING ─────────────────────────────
app.use(express.json({ limit: '20mb' }));   // 20mb for base64 product images
app.use(express.urlencoded({ extended:true, limit:'20mb' }));
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── DATABASE ──────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected — Aeindri Farms'))
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });

// ── ROUTES ────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart',       require('./routes/cart'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/reviews',    require('./routes/reviews'));
app.use('/api/admin',      require('./routes/admin'));

// ── RAZORPAY ORDER CREATION ───────────────────
// Creates a Razorpay order so the frontend can use order_id
app.post('/api/payment/create-order', require('./middleware/auth').protect, async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const { amount } = req.body; // amount in rupees
    const order = await rzp.orders.create({
      amount:   Math.round(amount * 100), // paise
      currency: 'INR',
      receipt:  'AF-' + Date.now(),
    });
    res.json({ success:true, order });
  } catch(err) {
    res.status(500).json({ success:false, message: err.message });
  }
});

// ── RAZORPAY PAYMENT VERIFICATION ────────────
app.post('/api/payment/verify', require('./middleware/auth').protect, (req, res) => {
  try {
    const crypto = require('crypto');
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');
    const isValid = expectedSig === razorpay_signature;
    res.json({ success:true, verified: isValid });
  } catch(err) {
    res.status(500).json({ success:false, message: err.message });
  }
});

// ── HEALTH CHECK ─────────────────────────────
app.get('/api/health', (req, res) => res.json({
  success: true,
  message: '🌿 Aeindri Farms API is running',
  version: '1.0.0',
  env:     process.env.NODE_ENV,
  ts:      new Date().toISOString(),
}));

// ── 404 ───────────────────────────────────────
app.use((req, res) => res.status(404).json({
  success:false, message:`Route ${req.originalUrl} not found`,
}));

// ── ERROR HANDLER ─────────────────────────────
app.use((err, req, res, next) => {
  console.error('🔴', err.message);
  res.status(err.statusCode || 500).json({
    success:false, message: err.message || 'Internal Server Error',
  });
});

// ── START ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🌿 Aeindri Farms API`);
  console.log(`🚀 http://localhost:${PORT}`);
  console.log(`📋 Mode: ${process.env.NODE_ENV}\n`);
});

module.exports = app;
