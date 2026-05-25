import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import axiosInstance from '../services/axiosConfig';

const PRIMARY = '#004AC6';

interface OrderItem {
    id: number;
    productId: number;
    variantId: number | null;
    productName: string;
    sku: string | null;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    product: {
        images?: Array<{ imageUrl: string }>;
    };
}

interface Payment {
    id: number;
    method: 'cod' | 'bank_transfer' | 'momo' | 'vnpay';
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    amount: string;
    paidAt: string | null;
}

interface AddressSnapshot {
    recipientName: string;
    phoneNumber: string;
    alternatePhoneNumber: string | null;
    streetAddress: string;
    ward: string;
    district: string;
    city: string;
}

interface Order {
    id: number;
    orderNumber: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'refunded';
    total: string;
    subtotal: string;
    shippingFee: string;
    note: string | null;
    adminNote: string | null;
    createdAt: string;
    placedAt: string;
    items: OrderItem[];
    payment: Payment | null;
    shippingSnapshot: AddressSnapshot;
    cancellationRequested: boolean;
}

export default function OrderDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.auth.user);

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cancel modal state
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelReason, setCancelReason] = useState('');
    const [isCancelling, setIsCancelling] = useState(false);

    // Dynamic timer countdown
    const [timeLeftStr, setTimeLeftStr] = useState<string>('');
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchOrderDetails = async () => {
        try {
            const response = await axiosInstance.get<{ data: Order }>(`/orders/${id}`);
            setOrder(response.data);
            setError(null);
        } catch (err) {
            const msg = typeof err === 'string' ? err : (err as { message?: string })?.message || 'Không thể tải chi tiết đơn hàng';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!user) {
            navigate(`/login?redirect=/orders/${id}`);
            return;
        }

        fetchOrderDetails();
    }, [id, user, navigate]);

    // Setup interactive countdown timer
    useEffect(() => {
        if (!order || order.status === 'cancelled' || order.status === 'delivered') {
            setTimeLeftStr('');
            return;
        }

        const updateTimer = () => {
            const createdAtMs = new Date(order.createdAt).getTime();
            const ageMs = Date.now() - createdAtMs;
            const limitMs = 30 * 60 * 1000; // 30 mins
            const remainingMs = limitMs - ageMs;

            if (remainingMs > 0 && (order.status === 'pending' || order.status === 'confirmed')) {
                const totalSeconds = Math.floor(remainingMs / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const formattedSec = seconds < 10 ? `0${seconds}` : seconds;
                setTimeLeftStr(`${minutes}:${formattedSec}`);
            } else {
                setTimeLeftStr('');
                if (order.status === 'pending' && remainingMs <= 0) {
                    // Trigger auto-confirm reload on client side
                    clearInterval(timerRef.current!);
                    fetchOrderDetails();
                }
            }
        };

        updateTimer();
        timerRef.current = setInterval(updateTimer, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [order]);

    const handleCancelOrderSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cancelReason.trim()) return;

        setIsCancelling(true);
        try {
            await axiosInstance.post(`/orders/${id}/cancel`, { reason: cancelReason });
            setShowCancelModal(false);
            setCancelReason('');
            // Reload order details
            await fetchOrderDetails();
        } catch (err) {
            alert(typeof err === 'string' ? err : (err as { message?: string })?.message || 'Không thể hủy đơn hàng');
        } finally {
            setIsCancelling(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" style={{ borderColor: `${PRIMARY} transparent transparent transparent` }}></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="mx-auto w-full max-w-[1280px] px-6 py-28 lg:px-8 text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                    <span className="material-symbols-outlined text-2xl">error</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Đơn hàng không tồn tại</h1>
                <p className="text-gray-500 mb-6">{error || 'Không tìm thấy dữ liệu đơn đặt hàng.'}</p>
                <Link to="/orders" className="rounded-full px-6 py-2.5 text-xs font-bold text-white shadow" style={{ backgroundColor: PRIMARY }}>
                    Quay về danh sách đơn hàng
                </Link>
            </div>
        );
    }

    // Determine current step index for the Stepper (0 to 4)
    const getStepIndex = (status: Order['status']): number => {
        switch (status) {
            case 'pending': return 0;
            case 'confirmed': return 1;
            case 'processing': return 2;
            case 'shipping': return 3;
            case 'delivered': return 4;
            default: return -1;
        }
    };

    const currentStep = getStepIndex(order.status);
    const steps = [
        { label: 'Đặt hàng thành công', icon: 'shopping_bag', desc: 'Đơn hàng mới đã được khởi tạo' },
        { label: 'Đã xác nhận', icon: 'verified', desc: 'Shop đã phê duyệt đơn hàng' },
        { label: 'Chuẩn bị hàng', icon: 'inventory_2', desc: 'Shop đang chuẩn bị đóng gói hàng hóa' },
        { label: 'Đang giao hàng', icon: 'local_shipping', desc: 'Đơn hàng đang trên đường tới bạn' },
        { label: 'Đã giao thành công', icon: 'task_alt', desc: 'Giao hàng thành công hoàn tất' }
    ];

    const ageMs = Date.now() - new Date(order.createdAt).getTime();
    const isUnder30Mins = ageMs < 30 * 60 * 1000;
    const canDirectCancel = isUnder30Mins && (order.status === 'pending' || order.status === 'confirmed');
    const canRequestCancel = !order.cancellationRequested && (order.status === 'processing' || (!isUnder30Mins && (order.status === 'pending' || order.status === 'confirmed')));

    return (
        <div className="mx-auto w-full max-w-[1280px] px-6 py-28 lg:px-8">
            {/* Header section */}
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <nav className="mb-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <Link to="/orders" className="hover:text-primary transition" style={{ color: PRIMARY }}>Đơn hàng</Link>
                        <span className="material-symbols-outlined text-[10px]">chevron_right</span>
                        <span className="text-gray-900 font-semibold">{order.orderNumber}</span>
                    </nav>
                    <h1 className="font-inter text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                        Chi tiết đơn hàng
                        <span className="text-sm font-semibold text-gray-400">#{order.orderNumber}</span>
                    </h1>
                </div>

                <Link
                    to="/orders"
                    className="rounded-full px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition active:scale-95 flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Quay lại danh sách
                </Link>
            </div>

            {/* Banner/Status Alerts */}
            {order.status === 'cancelled' ? (
                <div className="mb-8 rounded-2xl bg-red-50 p-6 border border-red-100 flex items-start gap-4">
                    <span className="material-symbols-outlined text-3xl text-red-500 shrink-0">cancel</span>
                    <div>
                        <h3 className="text-base font-bold text-red-900 mb-1">Đơn hàng này đã bị hủy</h3>
                        <p className="text-sm text-red-700">
                            Hệ thống đã tự động hoàn trả số lượng hàng vào kho. Tiền thanh toán của bạn (nếu có) sẽ được xử lý theo quy trình hoàn tiền.
                        </p>
                        {order.adminNote && (
                            <p className="text-xs text-red-500 mt-2 font-medium bg-red-100/50 rounded-lg p-2.5 inline-block">
                                Chi tiết hủy: {order.adminNote}
                            </p>
                        )}
                    </div>
                </div>
            ) : order.cancellationRequested ? (
                <div className="mb-8 rounded-2xl bg-orange-50 p-6 border border-orange-100 flex items-start gap-4">
                    <span className="material-symbols-outlined text-3xl text-orange-500 shrink-0 animate-pulse">hourglass_top</span>
                    <div>
                        <h3 className="text-base font-bold text-orange-900 mb-1">Đã gửi yêu cầu hủy đơn hàng</h3>
                        <p className="text-sm text-orange-700">
                            Yêu cầu hủy đơn hàng của bạn đang được Shop xem xét. Shop đang đóng gói hàng nên việc tự hủy trực tiếp đã bị khóa. Vui lòng chờ phản hồi hoặc liên hệ hỗ trợ.
                        </p>
                    </div>
                </div>
            ) : timeLeftStr && (
                <div className="mb-8 rounded-2xl bg-blue-50 p-6 border border-blue-100 flex items-start gap-4 shadow-sm">
                    <span className="material-symbols-outlined text-3xl text-blue-600 shrink-0 animate-spin" style={{ animationDuration: '3s' }}>update</span>
                    <div>
                        <h3 className="text-base font-bold text-blue-900 mb-1">Đơn hàng trong giai đoạn chờ 30 phút</h3>
                        <p className="text-sm text-blue-700">
                            Đơn hàng sẽ tự động chuyển sang trạng thái **Đã xác nhận** sau <span className="font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md font-mono">{timeLeftStr}</span> phút nữa. Trong thời gian này, bạn hoàn toàn có thể **hủy trực tiếp** mà không cần chờ duyệt!
                        </p>
                    </div>
                </div>
            )}

            {/* Stepper Tracking Section */}
            {order.status !== 'cancelled' && (
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mb-8">
                    <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-8 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">route</span>
                        Theo dõi trạng thái đơn hàng
                    </h2>

                    {/* Stepper horizontal for larger screens, vertical for mobile */}
                    <div className="hidden md:flex items-start justify-between relative">
                        {/* Connecting Line background */}
                        <div className="absolute top-5 left-1/10 right-1/10 h-1 bg-gray-100 z-0"></div>
                        {/* Connecting Active Line */}
                        <div
                            className="absolute top-5 left-1/10 h-1 bg-blue-600 z-0 transition-all duration-500"
                            style={{ width: `${currentStep * 20}%` }}
                        ></div>

                        {steps.map((step, idx) => {
                            const isCompleted = idx <= currentStep;
                            const isActive = idx === currentStep;

                            return (
                                <div key={idx} className="flex flex-col items-center text-center w-1/5 z-10 relative">
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 font-bold ${
                                            isActive
                                                ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100 scale-110'
                                                : isCompleted
                                                ? 'bg-blue-50 text-blue-600 border-blue-600'
                                                : 'bg-white text-gray-300 border-gray-200'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{step.icon}</span>
                                    </div>
                                    <p className={`mt-3 text-xs font-bold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {step.label}
                                    </p>
                                    <p className="mt-1 text-[10px] text-gray-400 px-2 line-clamp-2">
                                        {step.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Stepper vertical for mobile */}
                    <div className="md:hidden space-y-6 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 before:z-0">
                        {steps.map((step, idx) => {
                            const isCompleted = idx <= currentStep;
                            const isActive = idx === currentStep;

                            return (
                                <div key={idx} className="flex gap-4 items-start relative z-10">
                                    <div
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition font-bold ${
                                            isActive
                                                ? 'bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100'
                                                : isCompleted
                                                ? 'bg-blue-50 text-blue-600 border-blue-600'
                                                : 'bg-white text-gray-300 border-gray-200'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{step.icon}</span>
                                    </div>
                                    <div className="pt-1">
                                        <h4 className={`text-xs font-bold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {step.label}
                                        </h4>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{step.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Grid details: shipping, items, checkout totals */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Product details */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Item list */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-4">
                            Sản phẩm đã mua
                        </h2>
                        <div className="divide-y divide-gray-100">
                            {order.items.map((item) => {
                                const mainImg = item.product?.images?.[0]?.imageUrl || 'https://via.placeholder.com/150';
                                return (
                                    <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center">
                                            <img
                                                src={mainImg}
                                                alt={item.productName}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-gray-900 line-clamp-2">{item.productName}</h4>
                                            <p className="text-xs text-gray-400 mt-1">Mã SKU: {item.sku || 'N/A'}</p>
                                            <p className="text-xs text-gray-500 font-medium mt-1">Số lượng: {item.quantity}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-sm font-bold text-gray-900 block">
                                                {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                                            </span>
                                            <span className="text-xs text-gray-400 mt-1 block">
                                                Tổng: {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Delivery & payment snapshot info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Shipping address info */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-blue-600 text-sm">home_pin</span>
                                Địa chỉ giao hàng
                            </h3>
                            {order.shippingSnapshot ? (
                                <div className="text-sm text-gray-600 space-y-1.5">
                                    <p className="font-bold text-gray-900">{order.shippingSnapshot.recipientName}</p>
                                    <p className="flex items-center gap-1 text-xs">
                                        <span className="material-symbols-outlined text-xs">call</span>
                                        {order.shippingSnapshot.phoneNumber}
                                    </p>
                                    <p className="text-xs leading-relaxed mt-1 text-gray-500">
                                        {order.shippingSnapshot.streetAddress}, Phường {order.shippingSnapshot.ward}, Quận {order.shippingSnapshot.district}, {order.shippingSnapshot.city}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">Không có dữ liệu chụp địa chỉ</p>
                            )}
                        </div>

                        {/* Payment info */}
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3 mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-blue-600 text-sm">credit_card</span>
                                Thông tin thanh toán
                            </h3>
                            {order.payment ? (
                                <div className="text-sm text-gray-600 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span>Phương thức:</span>
                                        <span className="font-bold text-gray-900 uppercase">
                                            {order.payment.method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : order.payment.method}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span>Trạng thái thanh toán:</span>
                                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                            order.payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            order.payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {order.payment.status === 'paid' ? 'Đã thanh toán' :
                                             order.payment.status === 'failed' ? 'Thất bại' :
                                             'Chưa thanh toán'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs border-t border-gray-50 pt-2">
                                        <span>Số tiền:</span>
                                        <span className="font-bold text-primary" style={{ color: PRIMARY }}>
                                            {Number(order.payment.amount).toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-400">Không có dữ liệu thanh toán</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Costs Summary & Actions */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Totals */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sticky top-28 space-y-6">
                        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
                            Chi tiết hóa đơn
                        </h2>

                        <div className="space-y-3 text-xs text-gray-600 border-b border-gray-100 pb-4">
                            <div className="flex justify-between">
                                <span>Tạm tính</span>
                                <span className="font-semibold text-gray-900">{Number(order.subtotal).toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Phí vận chuyển</span>
                                <span className="font-semibold text-gray-900">
                                    {Number(order.shippingFee) === 0 ? 'Miễn phí' : `${Number(order.shippingFee).toLocaleString('vi-VN')}đ`}
                                </span>
                            </div>
                        </div>

                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-bold text-gray-900">Tổng cộng</span>
                            <span className="text-lg font-extrabold text-primary" style={{ color: PRIMARY }}>
                                {Number(order.total).toLocaleString('vi-VN')}đ
                            </span>
                        </div>

                        {order.note && (
                            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500 border border-gray-100">
                                <span className="font-bold text-gray-700 block mb-1">Lời nhắn của bạn:</span>
                                "{order.note}"
                            </div>
                        )}

                        {/* Interactive Cancel / Request cancel actions */}
                        {canDirectCancel && (
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(true)}
                                className="w-full rounded-full py-3 text-center font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition flex items-center justify-center gap-1 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">cancel</span>
                                Hủy đơn hàng trực tiếp
                            </button>
                        )}

                        {canRequestCancel && (
                            <button
                                type="button"
                                onClick={() => setShowCancelModal(true)}
                                className="w-full rounded-full py-3 text-center font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-md transition flex items-center justify-center gap-1 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-sm">chat_bubble</span>
                                Gửi yêu cầu hủy đơn
                            </button>
                        )}

                        {order.cancellationRequested && order.status !== 'cancelled' && (
                            <button
                                type="button"
                                disabled
                                className="w-full rounded-full py-3 text-center font-bold text-orange-700 bg-orange-100 border border-orange-200 cursor-not-allowed text-xs flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">hourglass_bottom</span>
                                Đã gửi yêu cầu hủy đơn hàng
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Cancel Order Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl animate-fade-in">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500">warning</span>
                                {canDirectCancel ? 'Xác nhận hủy đơn hàng' : 'Gửi yêu cầu hủy đơn'}
                            </h3>
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="text-gray-400 hover:text-gray-600 active:scale-90"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCancelOrderSubmit}>
                            <p className="text-xs text-gray-500 leading-relaxed mb-4">
                                {canDirectCancel
                                    ? 'Đơn hàng đang ở thời gian dưới 30 phút, bạn có thể tự do hủy ngay lập tức. Vui lòng cung cấp lý do hủy để giúp shop cải thiện dịch vụ.'
                                    : 'Đơn hàng đã quá thời gian 30 phút hoặc đang trong quá trình chuẩn bị hàng. Việc hủy ngay lập tức bị chặn, thay vào đó shop nhận yêu cầu và phê duyệt cho bạn.'}
                            </p>

                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Lý do hủy đơn hàng *</label>
                            <input
                                type="text"
                                required
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none transition mb-6"
                                placeholder="Nhập lý do chi tiết..."
                            />

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCancelModal(false)}
                                    className="rounded-full px-5 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCancelling || !cancelReason.trim()}
                                    className={`rounded-full px-5 py-2.5 text-xs font-bold text-white transition flex items-center gap-1 active:scale-95 ${
                                        isCancelling ? 'bg-gray-400' : canDirectCancel ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'
                                    }`}
                                >
                                    {isCancelling ? 'Đang xử lý...' : canDirectCancel ? 'Xác nhận hủy đơn' : 'Gửi yêu cầu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
