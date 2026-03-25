const express  = require('express');
const router   = express.Router();
const Order    = require('../models/Order');
const Product  = require('../models/Product');
const User     = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin'));

router.get('/stats', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const [totalOrders, todayOrders, totalUsers, totalProducts, revenueData, lowStock, cancelledOrders] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true }),
      Order.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Product.countDocuments({ isActive: true, $expr: { $lte: ['$stock', '$lowStockAt'] } }),
      Order.countDocuments({ status: 'cancelled' }),
    ]);
    res.json({ success: true, stats: {
      totalOrders, todayOrders, totalUsers, totalProducts,
      totalRevenue: revenueData[0]?.total || 0,
      cancelledOrders, lowStock,
    }});
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/revenue-chart', async (req, res) => {
  try {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0,0,0,0); return d;
    });
    const data = await Promise.all(days.map(async (day) => {
      const next = new Date(day); next.setDate(next.getDate() + 1);
      const r = await Order.aggregate([
        { $match: { createdAt: { $gte: day, $lt: next }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } }
      ]);
      return { date: day.toDateString().slice(0,3), revenue: r[0]?.revenue || 0 };
    }));
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
