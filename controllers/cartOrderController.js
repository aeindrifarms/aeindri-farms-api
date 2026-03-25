// controllers/cartOrderController.js
const Cart    = require('../models/Cart');
const Order   = require('../models/Order');
const Product = require('../models/Product');

// ════ CART ════

exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name emoji price stock isActive unit');
    if (!cart) cart = await Cart.create({ user: req.user.id, items: [] });
    cart.items = cart.items.filter(item => item.product?.isActive);
    await cart.save();
    res.json({ success: true, cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const product = await Product.findById(productId);
    if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found.' });
    if (product.stock < quantity) return res.status(400).json({ success: false, message: `Only ${product.stock} units available.` });
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });
    const existing = cart.items.find(i => i.product.toString() === productId);
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, product.stock);
    else cart.items.push({ product: productId, quantity, price: product.price });
    await cart.save();
    await cart.populate('items.product', 'name emoji price stock unit');
    res.json({ success: true, message: `${product.name} added to cart!`, cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
    const item = cart.items.find(i => i.product.toString() === req.params.productId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not in cart.' });
    if (quantity <= 0) cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
    else item.quantity = quantity;
    await cart.save();
    await cart.populate('items.product', 'name emoji price stock unit');
    res.json({ success: true, message: 'Cart updated.', cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ success: false, message: 'Cart not found.' });
    cart.items = cart.items.filter(i => i.product.toString() !== req.params.productId);
    await cart.save();
    res.json({ success: true, message: 'Item removed from cart.', cart });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [], coupon: '' });
    res.json({ success: true, message: 'Cart cleared.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ════ ORDERS ════

exports.createOrder = async (req, res) => {
  try {
    const { deliveryAddress, paymentMethod = 'cod', deliverySlot, couponCode, notes } = req.body;
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
    if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Your cart is empty.' });

    const orderItems = [];
    for (const item of cart.items) {
      const p = item.product;
      if (!p?.isActive) return res.status(400).json({ success: false, message: `A product is no longer available.` });
      if (p.stock < item.quantity) return res.status(400).json({ success: false, message: `Only ${p.stock} units of ${p.name} left.` });
      orderItems.push({ product: p._id, name: p.name, emoji: p.emoji, price: p.price, quantity: item.quantity, unit: p.unit });
    }

    const subtotal       = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const deliveryCharge = subtotal >= 499 ? 0 : 40;
    let   discount       = 0;
    if (couponCode === 'AEINDRI20') discount = Math.round(subtotal * 0.2);
    const total = subtotal + deliveryCharge - discount;

    const order = await Order.create({
      user: req.user.id, items: orderItems, subtotal, deliveryCharge,
      discount, couponCode, total, deliveryAddress, paymentMethod,
      deliverySlot, notes, status: 'pending',
    });

    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity } });
    }
    await Cart.findOneAndUpdate({ user: req.user.id }, { items: [], coupon: '' });
    res.status(201).json({ success: true, message: 'Order placed successfully! 🌿', order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { user: req.user.id };
    if (status) query.status = status;
    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, total, orders });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId, user: req.user.id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (['shipped','delivered','cancelled'].includes(order.status))
      return res.status(400).json({ success: false, message: `Cannot cancel a ${order.status} order.` });
    order.status       = 'cancelled';
    order.cancelReason = req.body.reason || 'Cancelled by customer';
    await order.save();
    for (const item of order.items) await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    res.json({ success: true, message: 'Order cancelled. Stock restored.', order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) query.orderId = new RegExp(search, 'i');
    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('user', 'firstName lastName phone email')
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(Number(limit));
    res.json({ success: true, total, orders });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const valid = ['pending','confirmed','processing','packed','shipped','delivered','cancelled'];
    if (!valid.includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    order.status = req.body.status;
    if (req.body.status === 'delivered') order.deliveredAt = new Date();
    await order.save();
    res.json({ success: true, message: `Order ${order.orderId} → ${order.status}`, order });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
