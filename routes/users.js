const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect);

router.put('/profile', async (req, res) => {
  const { firstName, lastName, receiveOffers } = req.body;
  const user = await User.findByIdAndUpdate(req.user.id, { firstName, lastName, receiveOffers }, { new: true });
  res.json({ success: true, user });
});

router.get('/addresses', async (req, res) => {
  const user = await User.findById(req.user.id).select('addresses');
  res.json({ success: true, addresses: user.addresses });
});
router.post('/addresses', async (req, res) => {
  const user = await User.findById(req.user.id);
  if (req.body.isDefault) user.addresses.forEach(a => a.isDefault = false);
  user.addresses.push(req.body);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});
router.delete('/addresses/:addrId', async (req, res) => {
  const user = await User.findById(req.user.id);
  user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addrId);
  await user.save();
  res.json({ success: true, addresses: user.addresses });
});

router.get('/wishlist', async (req, res) => {
  const user = await User.findById(req.user.id).populate('wishlist', 'name emoji price mrp unit');
  res.json({ success: true, wishlist: user.wishlist });
});
router.post('/wishlist/:productId', async (req, res) => {
  const user = await User.findById(req.user.id);
  const pid  = req.params.productId;
  const idx  = user.wishlist.map(String).indexOf(pid);
  let msg;
  if (idx === -1) { user.wishlist.push(pid); msg = 'Added to wishlist ❤️'; }
  else            { user.wishlist.splice(idx, 1); msg = 'Removed from wishlist'; }
  await user.save();
  res.json({ success: true, message: msg });
});

router.get('/', restrictTo('admin'), async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const total = await User.countDocuments({ role: 'customer' });
  const users = await User.find({ role: 'customer' }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
  res.json({ success: true, total, users });
});

module.exports = router;
