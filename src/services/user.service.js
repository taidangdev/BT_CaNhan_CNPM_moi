const User = require('../models/user.model');
const crypto = require('crypto');
const redisClient = require('../config/redis');
const { sendEditProfileOtp } = require('./mail.service');
const { otpKeysForEmailInput, EDIT_PROFILE_OTP_PREFIX } = require('../utils/otpRedisKeys');
const { normalizeOtpDigits } = require('../utils/otpDigits');

const OTP_TTL_SEC = Number(process.env.OTP_TTL_SECONDS) || 600;

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const redisSetOtp = async (prefix, emailInput, otp) => {
    const keys = otpKeysForEmailInput(prefix, emailInput);
    for (const k of keys) {
        await redisClient.set(k, otp, { EX: OTP_TTL_SEC });
    }
};

const redisClearOtp = async (prefix, emailInput) => {
    const keys = otpKeysForEmailInput(prefix, emailInput);
    for (const k of keys) {
        await redisClient.del(k);
    }
};

const requestEditProfileOtp = async (userId) => {
    const user = await User.findByPk(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    const otp = generateOtp();
    await redisSetOtp(EDIT_PROFILE_OTP_PREFIX, user.email, otp);
    await sendEditProfileOtp(user.email, otp, OTP_TTL_SEC);

    return { message: 'OTP đã được gửi đến email của bạn để xác thực thay đổi thông tin.' };
};

/**
 * Service: Cập nhật Profile User trong Database
 */
const updateUserProfile = async (userId, updateData, otp) => {
    if (!otp) {
        const error = new Error('Vui lòng cung cấp mã OTP để cập nhật thông tin');
        error.statusCode = 400;
        throw error;
    }

    // 1. Tìm User trong DB
    const user = await User.findByPk(userId);
    
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    // Xác thực OTP
    const otpDigits = normalizeOtpDigits(otp);
    if (otpDigits.length !== 6) {
        const err = new Error('Mã OTP phải gồm đúng 6 chữ số');
        err.statusCode = 400;
        throw err;
    }

    const keys = otpKeysForEmailInput(EDIT_PROFILE_OTP_PREFIX, user.email);
    const storedVals = await Promise.all(keys.map((k) => redisClient.get(k)));
    let otpValid = false;

    for (let i = 0; i < keys.length; i += 1) {
        const raw = storedVals[i];
        if (raw && normalizeOtpDigits(raw) === otpDigits) {
            otpValid = true;
            break;
        }
    }

    if (!otpValid) {
        const err = new Error('OTP không đúng hoặc đã hết hạn');
        err.statusCode = 400;
        throw err;
    }

    // 2. Thực hiện update dữ liệu
    await user.update(updateData);
    
    // Xóa OTP
    await redisClearOtp(EDIT_PROFILE_OTP_PREFIX, user.email);

    return user;
};

const getUserPublicById = async (userId) => {
    const { User: UserModel, Major } = require('../models');
    const user = await UserModel.findByPk(userId, {
        attributes: [
            'id',
            'username',
            'email',
            'fullName',
            'phone',
            'address',
            'role',
            'status',
            'studentId',
            'majorId',
            'avatarUrl',
            'emailVerifiedAt',
            'createdAt',
            'updatedAt'
        ],
        include: [{ model: Major, as: 'major', attributes: ['id', 'code', 'name'], required: false }]
    });

    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }

    return user;
};

const toggleWishlist = async (userId, productId) => {
    const { Wishlist, Product } = require('../models');

    const product = await Product.findByPk(productId);
    if (!product) {
        throw new Error('Sản phẩm không tồn tại');
    }

    const existing = await Wishlist.findOne({
        where: { userId, productId }
    });

    if (existing) {
        await existing.destroy();
        return { message: 'Đã xóa khỏi danh sách yêu thích', inWishlist: false };
    } else {
        await Wishlist.create({ userId, productId });
        return { message: 'Đã thêm vào danh sách yêu thích', inWishlist: true };
    }
};

const getWishlist = async (userId) => {
    const { Wishlist, Product, ProductImage, Category } = require('../models');
    const rows = await Wishlist.findAll({
        where: { userId },
        include: [{
            model: Product,
            as: 'product',
            include: [
                {
                    model: ProductImage,
                    as: 'images',
                    attributes: ['id', 'url', 'altText', 'isPrimary', 'sortOrder']
                },
                {
                    model: Category,
                    as: 'category',
                    attributes: ['id', 'name', 'slug', 'parentId']
                }
            ]
        }]
    });

    // Helper map
    const mapProductRow = (p) => {
        const json = p.toJSON ? p.toJSON() : p;
        const primaryImage = json.images?.find((img) => img.isPrimary) || json.images?.[0] || null;
        return {
            id: json.id,
            name: json.name,
            slug: json.slug,
            price: Number(json.price),
            compareAtPrice: json.compareAtPrice != null ? Number(json.compareAtPrice) : null,
            imageUrl: primaryImage?.url || null,
            imageAlt: primaryImage?.altText || json.name,
            category: json.category
        };
    };

    return rows.map(r => r.product ? mapProductRow(r.product) : null).filter(Boolean);
};

module.exports = {
    requestEditProfileOtp,
    updateUserProfile,
    getUserPublicById,
    toggleWishlist,
    getWishlist
};
