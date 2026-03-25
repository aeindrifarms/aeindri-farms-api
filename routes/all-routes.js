// ═══════════════════════════════════════════════
//  routes/auth.js
// ═══════════════════════════════════════════════
const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const ctrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const pwRules = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').matches(/^\d{10}$/).withMessage('Valid 10-digit phone is required'),
  ...pwRules,
], ctrl.register);

router.post('/verify-otp',     ctrl.verifyOTP);
router.post('/resend-otp',     ctrl.resendOTP);
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
], ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password',  ctrl.resetPassword);
router.put('/change-password',  protect, ctrl.changePassword);
router.get('/me',               protect, ctrl.getMe);
router.post('/logout',          protect, ctrl.logout);

module.exports = router;


// ═══════════════════════════════════════════════
//  routes/products.js
// ═══════════════════════════════════════════════
const express2 = require('express');
const r2 = express2.Router();
const pc = require('../controllers/productController');
const { protect: prot, restrictTo } = require('../middleware/auth');

r2.get('/',           pc.getProducts);
r2.get('/featured',   pc.getFeatured);
r2.get('/low-stock',  prot, restrictTo('admin'), pc.getLowStock);
r2.get('/:id',        pc.getProduct);
r2.post('/',          prot, restrictTo('admin'), pc.createProduct);
r2.put('/:id',        prot, restrictTo('admin'), pc.updateProduct);
r2.patch('/:id/stock',prot, restrictTo('admin'), pc.updateStock);
r2.delete('/:id',     prot, restrictTo('admin'), pc.deleteProduct);

module.exports = r2;


// ═══════════════════════════════════════════════
//  routes/categories.js
// ═══════════════════════════════════════════════
const express3  = require('express');
const r3        = express3.Router();
const Category  = require('../models/Category');
const { protect: p3, restrictTo: rt3 } = require('../middleware/auth');

// Get all categories
r3.get('/', async (req, res) => {
  const cats = await Category.find({ isActive: true }).sort('sortOrder');
  res.json({ success: true, categories: cats });
});
// Create category [admin]
r3.post('/', p3, rt3('admin'), async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json({ success: true, category: cat });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});
// Update category [admin]
r3.put('/:id', p3, rt3('admin'), async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, category: cat });
});

module.exports = r3;


// ═══════════════════════════════════════════════
//  routes/cart.js
// ═══════════════════════════════════════════════
const express4 = require('express');
const r4 = express4.Router();
const { protect: p4 } = require('../middleware/auth');
const cc = require('../controllers/cartOrderController');

r4.use(p4); // all cart routes require login
r4.get('/',               cc.getCart);
r4.post('/',              cc.addToCart);
r4.put('/:productId',     cc.updateCartItem);
r4.delete('/:productId',  cc.removeFromCart);
r4.delete('/',            cc.clearCart);

module.exports = r4;


// ═══════════════════════════════════════════════
//  routes/orders.js
// ═══════════════════════════════════════════════
const express5 = require('express');
const r5 = express5.Router();
const { protect: p5, restrictTo: rt5 } = require('../middleware/auth');
const oc = require('../controllers/cartOrderController');

r5.use(p5);
r5.post('/',                            oc.createOrder);
r5.get('/my-orders',                    oc.getMyOrders);
r5.get('/all',     rt5('admin'),        oc.getAllOrders);
r5.get('/:orderId',                     oc.getOrder);
r5.post('/:orderId/cancel',             oc.cancelOrder);
r5.patch('/:orderId/status', rt5('admin'), oc.updateOrderStatus);

module.exports = r5;


// ═══════════════════════════════════════════════
//  routes/users.js
// ═══════════════════════════════════════════════
const express6 = require('express');
const r6 = express6.Router();
const User2 = require('../models/User');
const { protect: p6, restrictTo: rt6 } = require('../middleware/auth');

r6.use(p6);

// Update profile
r6.put('/profile', async (req, res) => {
  const { firstName, lastName, receiveOffers } = req.body;
  const user = await User2.findByIdAndUpdate(req.user.id, { firstName, lastName, receiveOffers }, { new: true });
  res.json({ success: true, user });
});

// Manage addresses
r6.get('/addresses', async (req, res) => {
  const user = await User2.findById(req.user.id).select('addresses');
  res.json({ success: true, addresses: user.addresses });
});
r6.post('/addresses', async (req, res) => {
  const user = await User2.findById(req.user.id);
  if (req.body.isDefault) user.addresses.forEach(a => a.isDefault = false);
  user.addresses.push(req.body);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});
r6.delete('/addresses/:addrId', async (req, res) => {
  const user = await User2.findById(req.user.id);
  user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addrId);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

// Wishlist
r6.get('/wishlist', async (req, res) => {
  const user = await User2.findById(req.user.id).populate('wishlist', 'name emoji price mrp unit');
  res.json({ success: true, wishlist: user.wishlist });
});
r6.post('/wishlist/:productId', async (req, res) => {
  const user = await User2.findById(req.user.id);
  const pid  = req.params.productId;
  const idx  = user.wishlist.indexOf(pid);
  let   msg;
  if (idx === -1) { user.wishlist.push(pid); msg = 'Added to wishlist ❤️'; }
  else            { user.wishlist.splice(idx, 1); msg = 'Removed from wishlist'; }
  await user.save();
  res.json({ success: true, message: msg });
});

// Admin: get all users
r6.get('/', rt6('admin'), async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const total = await User2.countDocuments({ role: 'customer' });
  const users = await User2.find({ role: 'customer' }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
  res.json({ success: true, total, users });
});

module.exports = r6;


// ═══════════════════════════════════════════════
//  routes/reviews.js
// ═══════════════════════════════════════════════
const express7 = require('express');
const r7 = express7.Router();
const { Review } = require('../models/index');
const { protect: p7, restrictTo: rt7 } = require('../middleware/auth');

// Get reviews for a product
r7.get('/product/:productId', async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, isApproved: true })
    .populate('user', 'firstName lastName')
    .sort({ createdAt: -1 });
  res.json({ success: true, reviews });
});

// Create review [logged in]
r7.post('/', p7, async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, user: req.user.id });
    res.status(201).json({ success: true, message: 'Review submitted! It will appear after approval.', review });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Approve review [admin]
r7.patch('/:id/approve', p7, rt7('admin'), async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  res.json({ success: true, review });
});

module.exports = r7;


// ═══════════════════════════════════════════════
//  routes/admin.js
// ═══════════════════════════════════════════════
const express8 = require('express');
const r8 = express8.Router();
const Order2   = require('../models/Order');
const Product3 = require('../models/Product');
const User3    = require('../models/User');
const { protect: p8, restrictTo: rt8 } = require('../middleware/auth');

r8.use(p8, rt8('admin'));

// Dashboard overview stats
r8.get('/stats', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [
      totalOrders, todayOrders, totalUsers, totalProducts,
      revenueData, lowStock
    ] = await Promise.all([
      Order2.countDocuments(),
      Order2.countDocuments({ createdAt: { $gte: today } }),
      User3.countDocuments({ role: 'customer' }),
      Product3.countDocuments({ isActive: true }),
      Order2.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Product3.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$lowStockAt'] } }),
    ]);
    const totalRevenue = revenueData[0]?.total || 0;
    const cancelledOrders = await Order2.countDocuments({ status: 'cancelled' });

    res.json({
      success: true,
      stats: { totalOrders, todayOrders, totalUsers, totalProducts, totalRevenue, cancelledOrders, lowStock }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Revenue by day (last 7 days)
r8.get('/revenue-chart', async (req, res) => {
  try {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0); return d;
    });
    const data = await Promise.all(days.map(async (day) => {
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const res2 = await Order2.aggregate([
        { $match: { createdAt: { $gte: day, $lt: next }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } }
      ]);
      return { date: day.toDateString().slice(0,3), revenue: res2[0]?.revenue || 0 };
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = r8;
