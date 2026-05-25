import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../services/axiosConfig';
import type { ApiEnvelope } from '../types/api';

export interface CartProductImage {
    id: number;
    imageUrl: string;
    isDefault: boolean;
}

export interface CartProduct {
    id: number;
    name: string;
    slug: string;
    price: number;
    compareAtPrice: number | null;
    stockQuantity: number;
    images?: CartProductImage[];
}

export interface CartVariant {
    id: number;
    name: string;
    price: number | null;
    stockQuantity: number;
}

export interface CartItemType {
    id: number;
    cartId: number;
    productId: number;
    variantId: number | null;
    quantity: number;
    unitPrice: number;
    createdAt: string;
    updatedAt: string;
    product: CartProduct;
    variant: CartVariant | null;
}

export interface CartType {
    id: number;
    userId: number;
    status: string;
    items: CartItemType[];
}

interface CartState {
    cart: CartType | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: CartState = {
    cart: null,
    isLoading: false,
    error: null
};

export const fetchCart = createAsyncThunk<
    CartType,
    void,
    { rejectValue: string }
>('cart/fetchCart', async (_, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.get<ApiEnvelope<CartType>>('/cart');
        return response.data;
    } catch (error) {
        const msg =
            typeof error === 'string'
                ? error
                : (error as { message?: string })?.message || 'Không thể tải giỏ hàng';
        return rejectWithValue(msg);
    }
});

export const addToCart = createAsyncThunk<
    CartType,
    { productId: number; variantId: number | null; quantity: number },
    { rejectValue: string }
>('cart/addToCart', async (payload, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.post<ApiEnvelope<CartType>>('/cart/items', payload);
        return response.data;
    } catch (error) {
        const msg =
            typeof error === 'string'
                ? error
                : (error as { message?: string })?.message || 'Không thể thêm sản phẩm vào giỏ hàng';
        return rejectWithValue(msg);
    }
});

export const updateCartQty = createAsyncThunk<
    CartType,
    { itemId: number; quantity: number },
    { rejectValue: string }
>('cart/updateCartQty', async ({ itemId, quantity }, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.put<ApiEnvelope<CartType>>(`/cart/items/${itemId}`, { quantity });
        return response.data;
    } catch (error) {
        const msg =
            typeof error === 'string'
                ? error
                : (error as { message?: string })?.message || 'Không thể cập nhật số lượng';
        return rejectWithValue(msg);
    }
});

export const removeCartItem = createAsyncThunk<
    CartType,
    number,
    { rejectValue: string }
>('cart/removeCartItem', async (itemId, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.delete<ApiEnvelope<CartType>>(`/cart/items/${itemId}`);
        return response.data;
    } catch (error) {
        const msg =
            typeof error === 'string'
                ? error
                : (error as { message?: string })?.message || 'Không thể xóa sản phẩm khỏi giỏ hàng';
        return rejectWithValue(msg);
    }
});

export const clearCart = createAsyncThunk<
    CartType,
    void,
    { rejectValue: string }
>('cart/clearCart', async (_, { rejectWithValue }) => {
    try {
        const response = await axiosInstance.delete<ApiEnvelope<CartType>>('/cart');
        return response.data;
    } catch (error) {
        const msg =
            typeof error === 'string'
                ? error
                : (error as { message?: string })?.message || 'Không thể xóa sạch giỏ hàng';
        return rejectWithValue(msg);
    }
});

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        resetCart: (state) => {
            state.cart = null;
            state.isLoading = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Cart
            .addCase(fetchCart.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCart.fulfilled, (state, action) => {
                state.isLoading = false;
                state.cart = action.payload;
            })
            .addCase(fetchCart.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? null;
            })
            // Add to Cart
            .addCase(addToCart.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(addToCart.fulfilled, (state, action) => {
                state.isLoading = false;
                state.cart = action.payload;
            })
            .addCase(addToCart.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? null;
            })
            // Update Cart Qty
            .addCase(updateCartQty.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateCartQty.fulfilled, (state, action) => {
                state.isLoading = false;
                state.cart = action.payload;
            })
            .addCase(updateCartQty.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? null;
            })
            // Remove Cart Item
            .addCase(removeCartItem.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(removeCartItem.fulfilled, (state, action) => {
                state.isLoading = false;
                state.cart = action.payload;
            })
            .addCase(removeCartItem.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? null;
            })
            // Clear Cart
            .addCase(clearCart.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(clearCart.fulfilled, (state, action) => {
                state.isLoading = false;
                state.cart = action.payload;
            })
            .addCase(clearCart.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? null;
            });
    }
});

export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;
