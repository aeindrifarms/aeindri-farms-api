const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/productController');
const { protect, restrictTo } = require('../middleware/auth');

router.get('/',            ctrl.getProducts);
router.get('/featured',    ctrl.getFeatured);
router.get('/low-stock',   protect, restrictTo('admin'), ctrl.getLowStock);
router.get('/:id',         ctrl.getProduct);
router.post('/',           protect, restrictTo('admin'), ctrl.createProduct);
router.put('/:id',         protect, restrictTo('admin'), ctrl.updateProduct);
router.patch('/:id/stock', protect, restrictTo('admin'), ctrl.updateStock);
router.delete('/:id',      protect, restrictTo('admin'), ctrl.deleteProduct);

module.exports = router;
