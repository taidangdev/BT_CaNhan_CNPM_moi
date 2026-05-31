const { body } = require('express-validator');

const reviewValidation = [
    body('rating')
        .notEmpty()
        .withMessage('Số sao đánh giá là bắt buộc')
        .isInt({ min: 1, max: 5 })
        .withMessage('Số sao đánh giá phải từ 1 đến 5'),
    body('comment')
        .trim()
        .notEmpty()
        .withMessage('Nội dung bình luận là bắt buộc')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Bình luận tối thiểu 10 ký tự và tối đa 1000 ký tự')
];

module.exports = { reviewValidation };
