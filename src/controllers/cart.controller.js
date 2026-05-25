const cartService = require('../services/cart.service');
const { successResponse } = require('../utils/responseHandler');

const getCart = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cart = await cartService.getCartDetails(userId);
        return successResponse(res, 200, 'Lấy giỏ hàng thành công', cart);
    } catch (error) {
        next(error);
    }
};

const addItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { productId, variantId, quantity } = req.body;
        const cart = await cartService.addToCart(userId, { productId, variantId, quantity: Number(quantity) });
        return successResponse(res, 200, 'Thêm sản phẩm vào giỏ hàng thành công', cart);
    } catch (error) {
        next(error);
    }
};

const updateItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const { quantity } = req.body;
        const cart = await cartService.updateCartItem(userId, itemId, { quantity: Number(quantity) });
        return successResponse(res, 200, 'Cập nhật số lượng thành công', cart);
    } catch (error) {
        next(error);
    }
};

const removeItem = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { itemId } = req.params;
        const cart = await cartService.deleteCartItem(userId, itemId);
        return successResponse(res, 200, 'Xóa sản phẩm khỏi giỏ hàng thành công', cart);
    } catch (error) {
        next(error);
    }
};

const emptyCart = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const cart = await cartService.clearCart(userId);
        return successResponse(res, 200, 'Xóa sạch giỏ hàng thành công', cart);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    emptyCart
};
