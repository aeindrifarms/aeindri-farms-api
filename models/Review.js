const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  order:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating:     { type: Number, required: true, min: 1, max: 5 },
  title:      { type: String, trim: true },
  comment:    { type: String, trim: true },
  images:     [String],
  isApproved: { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

reviewSchema.post('save', async function () {
  const Product = mongoose.model('Product');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { product: this.product, isApproved: true } },
    { $group: { _id: '$product', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length) {
    await Product.findByIdAndUpdate(this.product, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count,
    });
  }
});

module.exports = mongoose.model('Review', reviewSchema);
