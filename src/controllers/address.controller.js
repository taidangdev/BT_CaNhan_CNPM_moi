const addressService = require('../services/address.service');
const { successResponse } = require('../utils/responseHandler');

const listAddresses = async (req, res, next) => {
    try {
        const addresses = await addressService.listAddresses(req.user.id);
        return successResponse(res, 200, 'Lấy danh sách địa chỉ thành công', { addresses });
    } catch (e) {
        next(e);
    }
};

const createAddress = async (req, res, next) => {
    try {
        const address = await addressService.createAddress(req.user.id, req.body);
        return successResponse(res, 201, 'Thêm địa chỉ thành công', { address });
    } catch (e) {
        next(e);
    }
};

const updateAddress = async (req, res, next) => {
    try {
        const address = await addressService.updateAddress(req.user.id, req.params.id, req.body);
        return successResponse(res, 200, 'Cập nhật địa chỉ thành công', { address });
    } catch (e) {
        next(e);
    }
};

const deleteAddress = async (req, res, next) => {
    try {
        const result = await addressService.deleteAddress(req.user.id, req.params.id);
        return successResponse(res, 200, result.message);
    } catch (e) {
        next(e);
    }
};

const setDefaultAddress = async (req, res, next) => {
    try {
        const address = await addressService.setDefaultAddress(req.user.id, req.params.id);
        return successResponse(res, 200, 'Đặt địa chỉ mặc định thành công', { address });
    } catch (e) {
        next(e);
    }
};

module.exports = {
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
