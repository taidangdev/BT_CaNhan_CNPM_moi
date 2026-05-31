const { sequelize, Order, OrderItem, Payment, Cart, CartItem, Product, ProductVariant, Address } = require('../models');
const { Op } = require('sequelize');

/**
 * Helper to dynamically check and auto-confirm pending orders older than 30 minutes
 */
const autoConfirmIfOld = async (order) => {
    if (order && order.status === 'pending') {
        const diffMs = Date.now() - new Date(order.createdAt).getTime();
        const diffMins = diffMs / (1000 * 60);
        if (diffMins >= 30) {
            order.status = 'confirmed';
            await order.save();
        }
    }
    return order;
};

/**
 * Create a new order (Checkout)
 */
const createOrder = async (userId, { shippingAddressId, addressData, note, paymentMethod = 'cod', promoCode, usePoints }) => {
    // 1. Fetch or create address
    let address;
    if (shippingAddressId) {
        address = await Address.findOne({
            where: { id: shippingAddressId, userId }
        });
    } else if (addressData) {
        address = await Address.create({
            userId,
            recipientName: addressData.recipientName,
            phoneNumber: addressData.phoneNumber,
            alternatePhoneNumber: addressData.alternatePhoneNumber || null,
            streetAddress: addressData.streetAddress,
            ward: addressData.ward,
            district: addressData.district,
            city: addressData.city,
            isDefault: false
        });
        shippingAddressId = address.id;
    }

    if (!address) {
        throw new Error('Địa chỉ giao hàng không hợp lệ');
    }

    // 2. Fetch active cart with items
    const cart = await Cart.findOne({
        where: { userId, status: 'active' },
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        as: 'product'
                    },
                    {
                        model: ProductVariant,
                        as: 'variant'
                    }
                ]
            }
        ]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
        throw new Error('Giỏ hàng trống');
    }

    // 3. Validate stock and calculate totals
    let subtotal = 0;
    const itemsToCreate = [];

    for (const item of cart.items) {
        const qty = item.quantity;
        let availableStock = 0;
        let pName = item.product.name;
        let pSku = item.product.sku;

        if (item.variantId) {
            if (!item.variant) {
                throw new Error(`Biến thể sản phẩm #${item.variantId} không tồn tại`);
            }
            availableStock = item.variant.stockQuantity;
            pName = `${item.product.name} (${item.variant.name})`;
            pSku = item.variant.sku || item.product.sku;
        } else {
            availableStock = item.product.stockQuantity;
        }

        if (qty > availableStock) {
            throw new Error(`Sản phẩm "${pName}" không đủ hàng trong kho. Còn lại: ${availableStock}`);
        }

        const lineTotal = item.unitPrice * qty;
        subtotal += lineTotal;

        itemsToCreate.push({
            productId: item.productId,
            variantId: item.variantId,
            productName: pName,
            sku: pSku,
            quantity: qty,
            unitPrice: item.unitPrice,
            lineTotal
        });
    }

    let discountAmount = 0;
    let pointsUsed = 0;
    let promo = null;

    if (promoCode) {
        const { Promotion } = require('../models');
        promo = await Promotion.findOne({
            where: {
                code: promoCode,
                isActive: true
            }
        });
        if (!promo) {
            throw new Error('Mã giảm giá không tồn tại hoặc đã hết hạn');
        }
        
        // Validate minimum order amount
        if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
            throw new Error(`Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã (Tối thiểu: ${promo.minOrderAmount}đ)`);
        }

        // Validate usage limit
        if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
            throw new Error('Mã giảm giá đã hết lượt sử dụng');
        }

        // Calculate discount
        if (promo.type === 'percentage') {
            if (promo.categoryId) {
                let eligibleSubtotal = 0;
                for (const item of cart.items) {
                    if (item.product.categoryId === promo.categoryId) {
                        eligibleSubtotal += item.unitPrice * item.quantity;
                    }
                }
                discountAmount += Math.round((eligibleSubtotal * Number(promo.value)) / 100);
            } else {
                discountAmount += Math.round((subtotal * Number(promo.value)) / 100);
            }
        } else if (promo.type === 'fixed_amount') {
            discountAmount += Number(promo.value);
        }
    }

    const User = require('../models/user.model');
    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('Không tìm thấy tài khoản người dùng');
    }

    if (usePoints) {
        const pointsAvailable = user.points || 0;
        // Quy đổi: 100 điểm = 10k VND -> 1 điểm = 100 VND
        const remainingAfterPromo = Math.max(0, subtotal - discountAmount);
        const maxPointsDiscount = remainingAfterPromo;
        const potentialPointsDiscount = pointsAvailable * 100;
        
        const actualPointsDiscount = Math.min(maxPointsDiscount, potentialPointsDiscount);
        pointsUsed = Math.floor(actualPointsDiscount / 100);
        discountAmount += actualPointsDiscount;
    }

    const shippingFee = subtotal > 500000 ? 0 : 30000; // Miễn phí ship với đơn trên 500k
    const total = Math.max(0, subtotal - discountAmount) + shippingFee;

    // Start Transaction
    const t = await sequelize.transaction();

    try {
        // Create order number
        const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Create Address snapshot to store permanently
        const shippingSnapshot = {
            recipientName: address.recipientName,
            phoneNumber: address.phoneNumber,
            alternatePhoneNumber: address.alternatePhoneNumber,
            streetAddress: address.streetAddress,
            ward: address.ward,
            district: address.district,
            city: address.city,
            isDefault: address.isDefault
        };

        // 4. Create Order
        const newOrder = await Order.create({
            orderNumber,
            userId,
            shippingAddressId,
            shippingSnapshot,
            status: 'pending',
            subtotal,
            discountAmount,
            shippingFee,
            total,
            note,
            placedAt: new Date()
        }, { transaction: t });

        // 5. Create Order Items & Deduct Stock
        for (const itemData of itemsToCreate) {
            await OrderItem.create({
                orderId: newOrder.id,
                ...itemData
            }, { transaction: t });

            // Deduct Stock
            if (itemData.variantId) {
                const variant = await ProductVariant.findByPk(itemData.variantId, { transaction: t });
                variant.stockQuantity -= itemData.quantity;
                await variant.save({ transaction: t });
            } else {
                const product = await Product.findByPk(itemData.productId, { transaction: t });
                product.stockQuantity -= itemData.quantity;
                await product.save({ transaction: t });
            }

            // Increment sold count
            const product = await Product.findByPk(itemData.productId, { transaction: t });
            product.soldCount += itemData.quantity;
            await product.save({ transaction: t });
        }

        // 6. Create Payment
        await Payment.create({
            orderId: newOrder.id,
            method: paymentMethod,
            status: 'pending',
            amount: total
        }, { transaction: t });

        // 7. Clear Cart Items
        await CartItem.destroy({
            where: { cartId: cart.id },
            transaction: t
        });

        // 8. Deduct Points if used
        if (pointsUsed > 0) {
            const dbUser = await User.findByPk(userId, { transaction: t });
            dbUser.points -= pointsUsed;
            await dbUser.save({ transaction: t });
        }

        // 9. Increment Coupon usedCount if applied
        if (promo) {
            const { Promotion } = require('../models');
            const dbPromo = await Promotion.findByPk(promo.id, { transaction: t });
            dbPromo.usedCount += 1;
            await dbPromo.save({ transaction: t });
        }

        await t.commit();

        // Return order with details
        return await getOrderDetails(userId, newOrder.id);
    } catch (error) {
        await t.rollback();
        throw error;
    }
};


/**
 * Get order details for a user
 */
const getOrderDetails = async (userId, orderId) => {
    let order = await Order.findOne({
        where: { id: orderId, userId },
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        as: 'product',
                        include: [{ model: ProductImage, as: 'images' }]
                    }
                ]
            },
            {
                model: Payment,
                as: 'payment'
            }
        ]
    });

    if (!order) {
        throw new Error('Đơn hàng không tồn tại hoặc bạn không có quyền xem');
    }

    // Auto confirm check if pending and > 30 minutes
    order = await autoConfirmIfOld(order);

    // Decorate the order object with cancellationRequested flag
    const orderData = order.toJSON();
    orderData.cancellationRequested = order.adminNote && order.adminNote.includes('[CANCELLATION_REQUESTED]');

    return orderData;
};

/**
 * List orders of a user
 */
const listOrders = async (userId, statusFilter) => {
    const where = { userId };
    if (statusFilter) {
        where.status = statusFilter;
    }

    const orders = await Order.findAll({
        where,
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        as: 'product',
                        include: [{ model: ProductImage, as: 'images' }]
                    }
                ]
            },
            {
                model: Payment,
                as: 'payment'
            }
        ],
        order: [['createdAt', 'DESC']]
    });

    // Check auto confirm for all orders
    const checkedOrders = [];
    for (let order of orders) {
        order = await autoConfirmIfOld(order);
        const orderData = order.toJSON();
        orderData.cancellationRequested = order.adminNote && order.adminNote.includes('[CANCELLATION_REQUESTED]');
        checkedOrders.push(orderData);
    }

    return checkedOrders;
};

/**
 * Cancel or request cancellation for an order
 */
const cancelOrRequestCancel = async (userId, orderId, cancellationReason = '') => {
    let order = await Order.findOne({
        where: { id: orderId, userId },
        include: [
            {
                model: OrderItem,
                as: 'items'
            },
            {
                model: Payment,
                as: 'payment'
            }
        ]
    });

    if (!order) {
        throw new Error('Đơn hàng không tồn tại hoặc bạn không có quyền thao tác');
    }

    // Auto-confirm check first
    order = await autoConfirmIfOld(order);

    const diffMs = Date.now() - new Date(order.createdAt).getTime();
    const diffMins = diffMs / (1000 * 60);

    // 1. Direct cancellation: under 30 minutes AND status is 'pending' or 'confirmed'
    if (diffMins < 30 && (order.status === 'pending' || order.status === 'confirmed')) {
        const t = await sequelize.transaction();
        try {
            order.status = 'cancelled';
            order.cancelledAt = new Date();
            order.adminNote = order.adminNote 
                ? `${order.adminNote}\n[SYSTEM] Khách hàng tự hủy đơn dưới 30 phút. Lý do: ${cancellationReason}`
                : `[SYSTEM] Khách hàng tự hủy đơn dưới 30 phút. Lý do: ${cancellationReason}`;
            await order.save({ transaction: t });

            // Restore stocks and decrease sold counts
            for (const item of order.items) {
                if (item.variantId) {
                    const variant = await ProductVariant.findByPk(item.variantId, { transaction: t });
                    if (variant) {
                        variant.stockQuantity += item.quantity;
                        await variant.save({ transaction: t });
                    }
                } else {
                    const product = await Product.findByPk(item.productId, { transaction: t });
                    if (product) {
                        product.stockQuantity += item.quantity;
                        await product.save({ transaction: t });
                    }
                }

                // Restore product sold count
                const product = await Product.findByPk(item.productId, { transaction: t });
                if (product) {
                    product.soldCount = Math.max(0, product.soldCount - item.quantity);
                    await product.save({ transaction: t });
                }
            }

            // Update payment if exists
            if (order.payment) {
                order.payment.status = 'failed';
                await order.payment.save({ transaction: t });
            }

            await t.commit();
            return await getOrderDetails(userId, orderId);
        } catch (error) {
            await t.rollback();
            throw error;
        }
    } 
    // 2. Request cancellation: if order is preparing ('processing') or over 30 mins (but not shipping/delivered/cancelled)
    else if (order.status === 'processing' || (diffMins >= 30 && (order.status === 'pending' || order.status === 'confirmed'))) {
        // If already requested, don't request again
        if (order.adminNote && order.adminNote.includes('[CANCELLATION_REQUESTED]')) {
            throw new Error('Đơn hàng đã được gửi yêu cầu hủy trước đó, vui lòng chờ Shop duyệt');
        }

        const dateStr = new Date().toLocaleString('vi-VN');
        const reqMsg = `[CANCELLATION_REQUESTED] Khách hàng yêu cầu hủy đơn lúc ${dateStr}. Lý do: ${cancellationReason}`;
        order.adminNote = order.adminNote ? `${order.adminNote}\n${reqMsg}` : reqMsg;
        await order.save();

        return await getOrderDetails(userId, orderId);
    } 
    // 3. Otherwise: Cannot cancel
    else {
        throw new Error('Đơn hàng hiện tại không thể hủy hoặc yêu cầu hủy (đơn đang giao hoặc đã giao)');
    }
};

const validateCoupon = async (promoCode, subtotal) => {
    const { Promotion } = require('../models');
    const promo = await Promotion.findOne({
        where: {
            code: promoCode,
            isActive: true
        }
    });
    if (!promo) {
        throw new Error('Mã giảm giá không tồn tại hoặc đã hết hạn');
    }
    const now = new Date();
    if (promo.startsAt && promo.startsAt > now) {
        throw new Error('Mã giảm giá chưa đến thời gian áp dụng');
    }
    if (promo.endsAt && promo.endsAt < now) {
        throw new Error('Mã giảm giá đã hết hạn');
    }
    if (promo.minOrderAmount && subtotal < promo.minOrderAmount) {
        throw new Error(`Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã (Tối thiểu: ${promo.minOrderAmount}đ)`);
    }
    if (promo.usageLimit && promo.usedCount >= promo.usageLimit) {
        throw new Error('Mã giảm giá đã hết lượt sử dụng');
    }

    let discountAmount = 0;
    if (promo.type === 'percentage') {
        discountAmount = Math.round((subtotal * Number(promo.value)) / 100);
    } else if (promo.type === 'fixed_amount') {
        discountAmount = Number(promo.value);
    }

    return {
        code: promo.code,
        name: promo.name,
        type: promo.type,
        value: promo.value,
        discountAmount
    };
};

module.exports = {
    createOrder,
    getOrderDetails,
    listOrders,
    cancelOrRequestCancel,
    validateCoupon
};

