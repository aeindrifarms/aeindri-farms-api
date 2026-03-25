// controllers/productController.js
const Product  = require('../models/Product');
const Category = require('../models/Category');

// ── GET ALL PRODUCTS (with filter, search, sort, paginate) ──
// GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, featured, page = 1, limit = 12 } = req.query;

    const query = { isActive: true };

    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) query.category = cat._id;
    }
    if (search) query.$text = { $search: search };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (featured === 'true') query.isFeatured = true;

    const sortOptions = {
      newest:     { createdAt: -1 },
      oldest:     { createdAt:  1 },
      price_asc:  { price:  1 },
      price_desc: { price: -1 },
      rating:     { rating: -1 },
      popular:    { reviewCount: -1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category', 'name slug emoji')
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      count: products.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
      products,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET SINGLE PRODUCT ────────────────────────
// GET /api/products/:id
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: [{ _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }, { slug: req.params.id }],
      isActive: true,
    }).populate('category', 'name slug emoji');

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── CREATE PRODUCT [admin] ────────────────────
// POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    await product.populate('category', 'name slug emoji');
    res.status(201).json({ success: true, message: 'Product created!', product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── UPDATE PRODUCT [admin] ────────────────────
// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('category', 'name slug emoji');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated!', product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── DELETE PRODUCT [admin] ────────────────────
// DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deactivated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── UPDATE STOCK [admin] ──────────────────────
// PATCH /api/products/:id/stock
exports.updateStock = async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Stock updated!', stock: product.stock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── FEATURED PRODUCTS ─────────────────────────
// GET /api/products/featured
exports.getFeatured = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true, isActive: true })
      .populate('category', 'name slug emoji')
      .limit(8);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── LOW STOCK ALERT [admin] ───────────────────
// GET /api/products/low-stock
exports.getLowStock = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true, $expr: { $lte: ['$stock', '$lowStockAt'] } })
      .populate('category', 'name slug');
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
