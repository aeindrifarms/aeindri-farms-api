const express = require('express');
const router  = express.Router();
const { Review } = require('../models/index');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/product/:productId', async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId, isApproved: true })
    .populate('user', 'firstName lastName').sort({ createdAt: -1 });
  res.json({ success: true, reviews });
});
router.post('/', protect, async (req, res) => {
  try {
    const review = await Review.create({ ...req.body, user: req.user.id });
    res.status(201).json({ success: true, message: 'Review submitted for approval.', review });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});
router.patch('/:id/approve', protect, restrictTo('admin'), async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  res.json({ success: true, review });
});

module.exports = router;
