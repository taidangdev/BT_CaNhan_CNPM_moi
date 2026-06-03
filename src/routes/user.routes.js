const express = require('express');
const userController = require('../controllers/user.controller');
const addressController = require('../controllers/address.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validation.middleware');

const router = express.Router();

router.use(verifyToken);

const editProfileValidation = [
    body('otp')
        .notEmpty().withMessage('OTP là bắt buộc')
        .matches(/^\d{6}$/).withMessage('OTP phải có đúng 6 chữ số'),
    body('fullName').optional().isString().withMessage('FullName must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('address').optional().isString().withMessage('Address must be a string')
];

router.get('/me', requirePermission('profile:read'), userController.getMe);

router.post(
    '/profile/request-otp',
    requirePermission('profile:update'),
    userController.requestEditProfileOtp
);

router.put(
    '/profile',
    requirePermission('profile:update'),
    editProfileValidation,
    validate,
    userController.editProfile
);

router.post(
    '/wishlist/:productId',
    requirePermission('profile:update'),
    userController.toggleWishlist
);

router.get(
    '/wishlist',
    requirePermission('profile:read'),
    userController.getWishlist
);

// --- Addresses ---
router.get('/addresses', requirePermission('profile:read'), addressController.listAddresses);
router.post('/addresses', requirePermission('profile:update'), addressController.createAddress);
router.put('/addresses/:id', requirePermission('profile:update'), addressController.updateAddress);
router.delete('/addresses/:id', requirePermission('profile:update'), addressController.deleteAddress);
router.post('/addresses/:id/default', requirePermission('profile:update'), addressController.setDefaultAddress);

module.exports = router;
