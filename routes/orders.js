const express = require('express');
const router  = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const ctrl = require('../controllers/cartOrderController');

router.use(protect);
router.post('/',                                  ctrl.createOrder);
router.get('/my-orders',                          ctrl.getMyOrders);
router.get('/all',          restrictTo('admin'),  ctrl.getAllOrders);
router.get('/:orderId',                           ctrl.getOrder);
router.post('/:orderId/cancel',                   ctrl.cancelOrder);
router.patch('/:orderId/status', restrictTo('admin'), ctrl.updateOrderStatus);

module.exports = router;
