const express = require('express');
const {
    listMajors,
    listCategories,
    listProducts,
    getProduct,
    getHome,
    createProductReview
} = require('../controllers/catalog.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { reviewValidation } = require('../validators/review.validator');
const { validate } = require('../middlewares/validation.middleware');

const router = express.Router();

router.get('/home', getHome);
router.get('/majors', listMajors);
router.get('/categories', listCategories);
router.get('/products', listProducts);
router.get('/products/:slug', getProduct);

router.post(
    '/products/:id/reviews',
    verifyToken,
    reviewValidation,
    validate,
    createProductReview
);

module.exports = router;
