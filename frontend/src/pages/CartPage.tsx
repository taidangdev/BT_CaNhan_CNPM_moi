import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchCart, updateCartQty, removeCartItem, clearCart } from '../store/cartSlice';

const PRIMARY = '#004AC6';

export default function CartPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const { cart, isLoading, error } = useAppSelector((state) => state.cart);

    useEffect(() => {
        if (!user) {
            navigate('/login?redirect=/cart');
        } else {
            dispatch(fetchCart());
        }
    }, [user, dispatch, navigate]);

    if (isLoading && !cart) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" style={{ borderColor: `${PRIMARY} transparent transparent transparent` }}></div>
            </div>
        );
    }

    const items = cart?.items || [];
    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const shippingFee = subtotal > 500000 || subtotal === 0 ? 0 : 30000;
    const total = subtotal + shippingFee;

    const handleQtyChange = (itemId: number, currentQty: number, change: number, stock: number) => {
        const newQty = currentQty + change;
        if (newQty <= 0) {
            if (window.confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng?')) {
                dispatch(removeCartItem(itemId));
            }
        } else if (newQty > stock) {
            alert(`Sản phẩm này chỉ còn ${stock} sản phẩm trong kho`);
        } else {
            dispatch(updateCartQty({ itemId, quantity: newQty }));
        }
    };

    const handleRemoveItem = (itemId: number) => {
        if (window.confirm('Bạn có muốn xóa sản phẩm này?')) {
            dispatch(removeCartItem(itemId));
        }
    };

    const handleClearCart = () => {
        if (window.confirm('Bạn có muốn xóa toàn bộ giỏ hàng?')) {
            dispatch(clearCart());
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1280px] px-6 py-28 lg:px-8">
            <h1 className="font-inter text-3xl font-extrabold tracking-tight text-gray-900 mb-8">
                Giỏ hàng của bạn
            </h1>

            {error && (
                <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    {error}
                </div>
            )}

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 px-4 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-primary" style={{ color: PRIMARY }}>
                        <span className="material-symbols-outlined text-3xl">shopping_cart</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn đang trống</h2>
                    <p className="text-gray-500 max-w-sm mb-8">
                        Hãy quay lại cửa hàng để lựa chọn các sản phẩm ưng ý và thêm chúng vào giỏ hàng.
                    </p>
                    <Link
                        to="/categories"
                        className="rounded-full px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-98"
                        style={{ backgroundColor: PRIMARY }}
                    >
                        Tiếp tục mua sắm
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* Items List */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                            <span className="text-sm font-medium text-gray-500">
                                Có {items.length} sản phẩm trong giỏ hàng
                            </span>
                            <button
                                onClick={handleClearCart}
                                className="text-xs font-semibold text-red-600 hover:text-red-800 transition flex items-center gap-1 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">delete_sweep</span>
                                Xóa toàn bộ
                            </button>
                        </div>

                        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                            {items.map((item) => {
                                const mainImg = item.product.images?.find(img => img.isDefault)?.imageUrl 
                                    || item.product.images?.[0]?.imageUrl 
                                    || 'https://via.placeholder.com/150';
                                const maxStock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;

                                return (
                                    <div key={item.id} className="flex gap-4 py-4 first:pt-2 last:pb-2">
                                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                                            <img
                                                src={mainImg}
                                                alt={item.product.name}
                                                className="h-full w-full object-cover object-center"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150';
                                                }}
                                            />
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between text-base font-semibold text-gray-900">
                                                    <h3 className="line-clamp-1 hover:underline">
                                                        <Link to={`/categories?product=${item.product.slug}`}>
                                                            {item.product.name}
                                                        </Link>
                                                    </h3>
                                                    <p className="ml-4 text-primary font-bold" style={{ color: PRIMARY }}>
                                                        {(Number(item.unitPrice) * item.quantity).toLocaleString('vi-VN')}đ
                                                    </p>
                                                </div>
                                                {item.variant && (
                                                    <p className="mt-1 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                                                        Phân loại: {item.variant.name}
                                                    </p>
                                                )}
                                                <p className="mt-1 text-xs text-gray-400">
                                                    Đơn giá: {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden h-8">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQtyChange(item.id, item.quantity, -1, maxStock)}
                                                        className="px-2 bg-gray-50 hover:bg-gray-100 transition active:bg-gray-200 flex items-center justify-center h-full text-gray-600"
                                                    >
                                                        <span className="material-symbols-outlined text-sm font-bold">remove</span>
                                                    </button>
                                                    <span className="w-10 text-center font-semibold text-gray-800 text-xs flex items-center justify-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQtyChange(item.id, item.quantity, 1, maxStock)}
                                                        className="px-2 bg-gray-50 hover:bg-gray-100 transition active:bg-gray-200 flex items-center justify-center h-full text-gray-600"
                                                    >
                                                        <span className="material-symbols-outlined text-sm font-bold">add</span>
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    className="font-medium text-red-500 hover:text-red-700 transition flex items-center gap-0.5 active:scale-95"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                    Xóa
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="lg:col-span-4">
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sticky top-28">
                            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-4">
                                Tóm tắt đơn hàng
                            </h2>

                            <div className="space-y-3 text-sm text-gray-600 border-b border-gray-100 pb-4 mb-4">
                                <div className="flex justify-between">
                                    <span>Tạm tính</span>
                                    <span className="font-semibold text-gray-900">{subtotal.toLocaleString('vi-VN')}đ</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Phí vận chuyển</span>
                                    <span className="font-semibold text-gray-900">
                                        {shippingFee === 0 ? 'Miễn phí' : `${shippingFee.toLocaleString('vi-VN')}đ`}
                                    </span>
                                </div>
                                {shippingFee > 0 && (
                                    <p className="text-[11px] text-gray-400 text-right">
                                        Mua thêm {(500000 - subtotal).toLocaleString('vi-VN')}đ để miễn phí vận chuyển!
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-between items-baseline mb-6">
                                <span className="text-base font-bold text-gray-900">Tổng cộng</span>
                                <span className="text-xl font-extrabold text-primary" style={{ color: PRIMARY }}>
                                    {total.toLocaleString('vi-VN')}đ
                                </span>
                            </div>

                            <Link
                                to="/checkout"
                                className="w-full rounded-full py-3.5 text-center font-bold text-white shadow-md hover:opacity-90 active:scale-98 transition flex items-center justify-center gap-2"
                                style={{ backgroundColor: PRIMARY }}
                            >
                                <span className="material-symbols-outlined">payment</span>
                                Tiến hành thanh toán
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
