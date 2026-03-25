// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: [true, 'Product name is required'], trim: true },
  slug:        { type: String, unique: true, lowercase: true },
  description: { type: String, required: [true, 'Description is required'] },
  category:    { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  emoji:       { type: String, default: '🥬' },
  images:      [{ url: String, public_id: String }],

  price:       { type: Number, required: [true, 'Price is required'], min: 0 },
  mrp:         { type: Number, required: [true, 'MRP is required'],   min: 0 },
  unit:        { type: String, required: [true, 'Unit is required'] }, // e.g. "1 kg", "500g"
  minOrder:    { type: Number, default: 1 },

  badge:       { type: String, default: '' }, // "Organic", "Fresh", "Sale"
  tags:        [String],

  stock:       { type: Number, required: true, default: 0, min: 0 },
  lowStockAt:  { type: Number, default: 10 },
  isActive:    { type: Boolean, default: true },
  isFeatured:  { type: Boolean, default: false },

  // Computed from reviews
  rating:       { type: Number, default: 0, min: 0, max: 5 },
  reviewCount:  { type: Number, default: 0 },

  // Farming info
  farmSource:  { type: String, default: 'Aeindri Partner Farms' },
  isOrganic:   { type: Boolean, default: false },
  shelfLife:   { type: String, default: '2-3 days' },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

// ── SLUG from name ───────────────────────────
productSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  }
  next();
});

// ── VIRTUAL: discount % ──────────────────────
productSchema.virtual('discount').get(function () {
  if (this.mrp > this.price) return Math.round(((this.mrp - this.price) / this.mrp) * 100);
  return 0;
});

// ── VIRTUAL: inStock ─────────────────────────
productSchema.virtual('inStock').get(function () {
  return this.stock > 0;
});

// Index for search
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
