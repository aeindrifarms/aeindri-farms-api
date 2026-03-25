const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/cartOrderController');

router.use(protect);
router.get('/',               ctrl.getCart);
router.post('/',              ctrl.addToCart);
router.put('/:productId',     ctrl.updateCartItem);
router.delete('/:productId',  ctrl.removeFromCart);
router.delete('/',            ctrl.clearCart);

module.exports = router;
