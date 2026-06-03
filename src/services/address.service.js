const { Address } = require('../models');

const listAddresses = async (userId) => {
    return await Address.findAll({
        where: { userId },
        order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });
};

const createAddress = async (userId, data) => {
    const { recipientName, phone, line1, line2, ward, district, city, isDefault, label } = data;

    if (isDefault) {
        await Address.update({ isDefault: false }, { where: { userId } });
    }

    const count = await Address.count({ where: { userId } });
    const finalIsDefault = count === 0 ? true : !!isDefault;

    return await Address.create({
        userId,
        recipientName,
        phone,
        line1,
        line2: line2 || null,
        ward,
        district,
        city,
        isDefault: finalIsDefault,
        label
    });
};

const updateAddress = async (userId, addressId, data) => {
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) {
        const err = new Error('Không tìm thấy địa chỉ');
        err.statusCode = 404;
        throw err;
    }

    const { recipientName, phone, line1, line2, ward, district, city, isDefault, label } = data;

    if (isDefault && !address.isDefault) {
        await Address.update({ isDefault: false }, { where: { userId } });
    }

    await address.update({
        recipientName,
        phone,
        line1,
        line2: line2 || null,
        ward,
        district,
        city,
        isDefault: isDefault ?? address.isDefault,
        label
    });

    return address;
};

const deleteAddress = async (userId, addressId) => {
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) {
        const err = new Error('Không tìm thấy địa chỉ');
        err.statusCode = 404;
        throw err;
    }

    const wasDefault = address.isDefault;
    await address.destroy();

    if (wasDefault) {
        const nextDefault = await Address.findOne({
            where: { userId },
            order: [['createdAt', 'DESC']]
        });
        if (nextDefault) {
            await nextDefault.update({ isDefault: true });
        }
    }

    return { message: 'Xóa địa chỉ thành công' };
};

const setDefaultAddress = async (userId, addressId) => {
    const address = await Address.findOne({ where: { id: addressId, userId } });
    if (!address) {
        const err = new Error('Không tìm thấy địa chỉ');
        err.statusCode = 404;
        throw err;
    }

    await Address.update({ isDefault: false }, { where: { userId } });
    await address.update({ isDefault: true });

    return address;
};

module.exports = {
    listAddresses,
    createAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress
};
