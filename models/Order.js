// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name:     { type: String, required: true },
  emoji:    { type: String },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit:     { type: String },
});

const orderSchema = new mongoose.Schema({
  orderId:   { type: String, unique: true }, // e.g. AF-1042
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  items:     [orderItemSchema],

  // Pricing
  subtotal:       { type: Number, required: true },
  deliveryCharge: { type: Number, default: 0 },
  discount:       { type: Number, default: 0 },
  couponCode:     { type: String, default: '' },
  total:          { type: Number, required: true },

  // Delivery address (snapshot at order time)
  deliveryAddress: {
    name:    String,
    phone:   String,
    line1:   String,
    line2:   String,
    city:    String,
    state:   String,
    pincode: String,
  },

  // Payment
  paymentMethod: { type: String, enum: ['razorpay', 'cod', 'upi'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  razorpayOrderId:   { type: String },
  razorpayPaymentId: { type: String },

  // Order lifecycle
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },

  // Timeline tracking
  timeline: [{
    status:    String,
    message:   String,
    timestamp: { type: Date, default: Date.now },
  }],

  deliverySlot:  { type: String },             // e.g. "6 AM - 10 AM"
  deliveredAt:   { type: Date },
  cancelReason:  { type: String },
  notes:         { type: String },
}, { timestamps: true });

// ── Auto-generate Order ID ───────────────────
orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderId = `AF-${1000 + count + 1}`;
  }
  next();
});

// ── Add timeline event on status change ──────
orderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const messages = {
      pending:    'Order placed successfully',
      confirmed:  'Order confirmed by Aeindri Farms',
      processing: 'Your order is being prepared',
      packed:     'Order packed and ready for dispatch',
      shipped:    'Out for delivery',
      delivered:  'Order delivered successfully',
      cancelled:  'Order cancelled',
    };
    this.timeline.push({
      status: this.status,
      message: messages[this.status] || this.status,
    });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
