const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.use(verifyToken);

router.post('/', orderController.placeOrder);
router.post('/validate-coupon', orderController.validateCoupon);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrder);
router.post('/:id/cancel', orderController.cancelMyOrder);

module.exports = router;
