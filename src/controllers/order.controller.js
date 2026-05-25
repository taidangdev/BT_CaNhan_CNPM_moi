const orderService = require('../services/order.service');
const { successResponse } = require('../utils/responseHandler');

const placeOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { shippingAddressId, addressData, note, paymentMethod } = req.body;
        const order = await orderService.createOrder(userId, {
            shippingAddressId: shippingAddressId ? Number(shippingAddressId) : undefined,
            addressData,
            note,
            paymentMethod
        });
        return successResponse(res, 201, 'Đặt hàng thành công', order);
    } catch (error) {
        next(error);
    }
};

const getOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const order = await orderService.getOrderDetails(userId, id);
        return successResponse(res, 200, 'Lấy chi tiết đơn hàng thành công', order);
    } catch (error) {
        next(error);
    }
};

const getMyOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;
        const orders = await orderService.listOrders(userId, status);
        return successResponse(res, 200, 'Lấy danh sách đơn hàng thành công', orders);
    } catch (error) {
        next(error);
    }
};

const cancelMyOrder = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { reason } = req.body;
        const order = await orderService.cancelOrRequestCancel(userId, id, reason);
        return successResponse(res, 200, 'Yêu cầu của bạn đã được ghi nhận thành công', order);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    placeOrder,
    getOrder,
    getMyOrders,
    cancelMyOrder
};
