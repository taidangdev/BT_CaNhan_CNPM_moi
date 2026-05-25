import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchCart, resetCart } from '../store/cartSlice';
import axiosInstance from '../services/axiosConfig';

const PRIMARY = '#004AC6';

interface AddressForm {
    recipientName: string;
    phoneNumber: string;
    streetAddress: string;
    ward: string;
    district: string;
    city: string;
}

export default function CheckoutPage() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const cart = useAppSelector((state) => state.cart.cart);

    const [formData, setFormData] = useState<AddressForm>({
        recipientName: '',
        phoneNumber: '',
        streetAddress: '',
        ward: '',
        district: '',
        city: ''
    });

    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vnpay' | 'momo'>('cod');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) {
            navigate('/login?redirect=/checkout');
        } else {
            dispatch(fetchCart());
        }
    }, [user, dispatch, navigate]);

    // Prepopulate name from user profile if available
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                recipientName: user.fullName || user.username || '',
                phoneNumber: user.phone || ''
            }));
        }
    }, [user]);

    const items = cart?.items || [];
    if (items.length === 0 && !isSubmitting) {
        return (
            <div className="mx-auto w-full max-w-[1280px] px-6 py-28 lg:px-8 flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-5xl text-gray-300 mb-4">shopping_cart</span>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Giỏ hàng của bạn đang trống</h1>
                <p className="text-gray-500 mb-8">Bạn không thể thanh toán khi không có sản phẩm nào.</p>
                <Link to="/" className="rounded-full px-6 py-3 text-white font-semibold shadow" style={{ backgroundColor: PRIMARY }}>
                    Quay về Trang chủ
                </Link>
            </div>
        );
    }

    const subtotal = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
    const shippingFee = subtotal > 500000 ? 0 : 30000;
    const total = subtotal + shippingFee;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validation
        if (!formData.recipientName || !formData.phoneNumber || !formData.streetAddress || !formData.ward || !formData.district || !formData.city) {
            setSubmitError('Vui lòng nhập đầy đủ thông tin giao hàng');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const response = await axiosInstance.post<{ data: { id: number } }>('/orders', {
                addressData: formData,
                note,
                paymentMethod
            });

            // Clean cart in Redux state
            dispatch(resetCart());

            // Navigate to Order details page!
            const newOrderId = response.data.id;
            navigate(`/orders/${newOrderId}?status=placed`);
        } catch (err) {
            const msg = typeof err === 'string' ? err : (err as { message?: string })?.message || 'Có lỗi xảy ra khi đặt hàng';
            setSubmitError(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-[1280px] px-6 py-28 lg:px-8">
            <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500 font-medium">
                <Link to="/cart" className="hover:text-primary transition" style={{ color: PRIMARY }}>Giỏ hàng</Link>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-gray-900 font-semibold">Thanh toán</span>
            </nav>

            <h1 className="font-inter text-3xl font-extrabold tracking-tight text-gray-900 mb-8">
                Thanh toán đơn hàng
            </h1>

            {submitError && (
                <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Billing and shipping info */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Shipping Address */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">local_shipping</span>
                            Thông tin nhận hàng
                        </h2>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Họ và tên người nhận *</label>
                                <input
                                    type="text"
                                    name="recipientName"
                                    value={formData.recipientName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Số điện thoại *</label>
                                <input
                                    type="tel"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Số nhà, Tên đường *</label>
                                <input
                                    type="text"
                                    name="streetAddress"
                                    value={formData.streetAddress}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition"
                                    placeholder="Ví dụ: 1 Võ Văn Ngân"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Phường / Xã *</label>
                                <input
                                    type="text"
                                    name="ward"
                                    value={formData.ward}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Quận / Huyện *</label>
                                <input
                                    type="text"
                                    name="district"
                                    value={formData.district}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Tỉnh / Thành phố *</label>
                                <input
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition"
                                    placeholder="Ví dụ: TP. Hồ Chí Minh"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payment methods */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">account_balance_wallet</span>
                            Phương thức thanh toán
                        </h2>

                        <div className="space-y-3">
                            {/* COD option */}
                            <label className="flex items-center gap-4 border border-blue-500 bg-blue-50/50 rounded-xl p-4 cursor-pointer transition select-none">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    checked={paymentMethod === 'cod'}
                                    onChange={() => setPaymentMethod('cod')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        Thanh toán khi nhận hàng (COD)
                                        <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">Mặc định</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">Bạn sẽ thanh toán bằng tiền mặt trực tiếp cho shipper khi nhận được hàng.</p>
                                </div>
                                <span className="material-symbols-outlined text-3xl text-gray-400">payments</span>
                            </label>

                            {/* MoMo dummy option */}
                            <label className="flex items-center gap-4 border border-gray-100 rounded-xl p-4 cursor-pointer opacity-70 hover:opacity-100 transition select-none">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    checked={paymentMethod === 'momo'}
                                    onChange={() => setPaymentMethod('momo')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        Thanh toán qua ví điện tử MoMo
                                        <span className="rounded bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-700 uppercase">Sắp ra mắt</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">Thanh toán nhanh gọn qua ứng dụng MoMo bằng mã QR code.</p>
                                </div>
                                <span className="material-symbols-outlined text-3xl text-pink-500">qr_code_2</span>
                            </label>

                            {/* VNPay dummy option */}
                            <label className="flex items-center gap-4 border border-gray-100 rounded-xl p-4 cursor-pointer opacity-70 hover:opacity-100 transition select-none">
                                <input
                                    type="radio"
                                    name="paymentMethod"
                                    checked={paymentMethod === 'vnpay'}
                                    onChange={() => setPaymentMethod('vnpay')}
                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                        Thanh toán qua cổng VNPAY
                                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 uppercase">Sắp ra mắt</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">Hỗ trợ thanh toán qua ATM Nội địa, QR Pay, Thẻ Quốc Tế Visa/MasterCard.</p>
                                </div>
                                <span className="material-symbols-outlined text-3xl text-indigo-500">credit_card</span>
                            </label>
                        </div>
                    </div>

                    {/* Order Note */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-600">note_alt</span>
                            Ghi chú đơn hàng
                        </h2>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Nhập ghi chú cho đơn hàng hoặc lời nhắn gửi cho shop (ví dụ: giao giờ hành chính, gọi trước khi giao...)"
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition h-24 resize-none"
                        />
                    </div>
                </div>

                {/* Checkout Summary Card */}
                <div className="lg:col-span-5">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sticky top-28 space-y-6">
                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
                            Đơn hàng của bạn
                        </h2>

                        {/* Items list */}
                        <div className="divide-y divide-gray-100 overflow-y-auto max-h-60 pr-2">
                            {items.map((item) => {
                                const mainImg = item.product.images?.find(img => img.isDefault)?.imageUrl 
                                    || item.product.images?.[0]?.imageUrl 
                                    || 'https://via.placeholder.com/150';

                                return (
                                    <div key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center">
                                            <img
                                                src={mainImg}
                                                alt={item.product.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.product.name}</h4>
                                            {item.variant && (
                                                <p className="text-[10px] text-blue-600 font-semibold mt-0.5">Mẫu: {item.variant.name}</p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-0.5">Số lượng: {item.quantity}</p>
                                        </div>
                                        <span className="text-xs font-bold text-gray-900 pl-2 shrink-0">
                                            {(Number(item.unitPrice) * item.quantity).toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Cost calculations */}
                        <div className="space-y-3 text-sm text-gray-600 border-t border-b border-gray-100 py-4">
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
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-baseline">
                            <span className="text-base font-bold text-gray-900">Tổng cộng</span>
                            <span className="text-xl font-extrabold text-primary" style={{ color: PRIMARY }}>
                                {total.toLocaleString('vi-VN')}đ
                            </span>
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full rounded-full py-4 text-center font-bold text-white shadow-md transition flex items-center justify-center gap-2 active:scale-98 ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'hover:opacity-90'}`}
                            style={{ backgroundColor: isSubmitting ? undefined : PRIMARY }}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"></div>
                                    Đang xử lý đơn hàng...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">shopping_bag</span>
                                    Xác nhận đặt hàng
                                </>
                            )}
                        </button>

                        <p className="text-[11px] text-gray-400 text-center">
                            Bằng cách bấm đặt hàng, bạn đồng ý với Điều khoản dịch vụ và chính sách mua sắm của UTEShop.
                        </p>
                    </div>
                </div>
            </form>
        </div>
    );
}
