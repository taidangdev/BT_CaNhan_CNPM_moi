const { Cart, CartItem, Product, ProductImage, ProductVariant } = require('../models');

/**
 * Get active cart of a user, or create one if it doesn't exist
 */
const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({
        where: { userId, status: 'active' }
    });

    if (!cart) {
        cart = await Cart.create({
            userId,
            status: 'active'
        });
    }

    return cart;
};

/**
 * Fetch full cart details including items, products, images, variants
 */
const getCartDetails = async (userId) => {
    const cart = await getOrCreateCart(userId);

    const fullCart = await Cart.findByPk(cart.id, {
        include: [
            {
                model: CartItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        as: 'product',
                        include: [
                            {
                                model: ProductImage,
                                as: 'images'
                            }
                        ]
                    },
                    {
                        model: ProductVariant,
                        as: 'variant'
                    }
                ]
            }
        ],
        order: [[ { model: CartItem, as: 'items' }, 'createdAt', 'DESC' ]]
    });

    return fullCart;
};

/**
 * Add an item to the cart
 */
const addToCart = async (userId, { productId, variantId, quantity }) => {
    if (quantity <= 0) {
        throw new Error('Số lượng sản phẩm phải lớn hơn 0');
    }

    // 1. Verify product
    const product = await Product.findByPk(productId);
    if (!product) {
        throw new Error('Sản phẩm không tồn tại');
    }

    let unitPrice = product.price;
    let availableStock = product.stockQuantity;
    let variantName = '';

    // 2. Verify variant if any
    if (variantId) {
        const variant = await ProductVariant.findOne({
            where: { id: variantId, productId }
        });
        if (!variant) {
            throw new Error('Biến thể sản phẩm không tồn tại');
        }
        if (variant.price !== null) {
            unitPrice = variant.price;
        }
        availableStock = variant.stockQuantity;
    }

    // 3. Get or create cart
    const cart = await getOrCreateCart(userId);

    // 4. Find if item already exists in the cart
    const whereClause = { cartId: cart.id, productId };
    if (variantId) {
        whereClause.variantId = variantId;
    } else {
        whereClause.variantId = null;
    }

    let cartItem = await CartItem.findOne({ where: whereClause });

    if (cartItem) {
        const newQuantity = cartItem.quantity + quantity;
        if (newQuantity > availableStock) {
            throw new Error(`Không đủ hàng trong kho. Còn lại: ${availableStock}`);
        }
        cartItem.quantity = newQuantity;
        cartItem.unitPrice = unitPrice;
        await cartItem.save();
    } else {
        if (quantity > availableStock) {
            throw new Error(`Không đủ hàng trong kho. Còn lại: ${availableStock}`);
        }
        cartItem = await CartItem.create({
            cartId: cart.id,
            productId,
            variantId: variantId || null,
            quantity,
            unitPrice
        });
    }

    return getCartDetails(userId);
};

/**
 * Update the quantity of a cart item
 */
const updateCartItem = async (userId, itemId, { quantity }) => {
    const cart = await getOrCreateCart(userId);

    const cartItem = await CartItem.findOne({
        where: { id: itemId, cartId: cart.id }
    });

    if (!cartItem) {
        throw new Error('Sản phẩm không có trong giỏ hàng');
    }

    if (quantity <= 0) {
        await cartItem.destroy();
        return getCartDetails(userId);
    }

    // Check stock
    let availableStock = 0;
    if (cartItem.variantId) {
        const variant = await ProductVariant.findByPk(cartItem.variantId);
        if (!variant) {
            throw new Error('Biến thể sản phẩm không tồn tại');
        }
        availableStock = variant.stockQuantity;
    } else {
        const product = await Product.findByPk(cartItem.productId);
        if (!product) {
            throw new Error('Sản phẩm không tồn tại');
        }
        availableStock = product.stockQuantity;
    }

    if (quantity > availableStock) {
        throw new Error(`Không đủ hàng trong kho. Còn lại: ${availableStock}`);
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    return getCartDetails(userId);
};

/**
 * Remove an item from the cart
 */
const deleteCartItem = async (userId, itemId) => {
    const cart = await getOrCreateCart(userId);

    const cartItem = await CartItem.findOne({
        where: { id: itemId, cartId: cart.id }
    });

    if (!cartItem) {
        throw new Error('Sản phẩm không có trong giỏ hàng');
    }

    await cartItem.destroy();
    return getCartDetails(userId);
};

/**
 * Clear all items in active cart
 */
const clearCart = async (userId) => {
    const cart = await getOrCreateCart(userId);
    await CartItem.destroy({ where: { cartId: cart.id } });
    return getCartDetails(userId);
};

module.exports = {
    getOrCreateCart,
    getCartDetails,
    addToCart,
    updateCartItem,
    deleteCartItem,
    clearCart
};
