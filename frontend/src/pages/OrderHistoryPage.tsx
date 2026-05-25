import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

interface Order {
    id: number;
    orderNumber: string;
    status: 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'refunded';
    total: string;
    subtotal: string;
    shippingFee: string;
    createdAt: string;
    items: OrderItem[];
    cancellationRequested: boolean;
}

export default function OrderHistoryPage() {
    const navigate = useNavigate();
    const user = useAppSelector((state) => state.auth.user);

    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('all');

    useEffect(() => {
        if (!user) {
            navigate('/login?redirect=/orders');
            return;
        }

        const fetchOrders = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await axiosInstance.get<{ data: Order[] }>('/orders');
                setOrders(response.data);
            } catch (err) {
                const msg = typeof err === 'string' ? err : (err as { message?: string })?.message || 'Không thể tải lịch sử đơn hàng';
                setError(msg);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [user, navigate]);

    const getStatusText = (status: Order['status'], cancellationRequested: boolean) => {
        if (cancellationRequested && status !== 'cancelled') {
            return 'Yêu cầu hủy đơn';
        }
        switch (status) {
            case 'pending': return 'Chờ xác nhận';
            case 'confirmed': return 'Đã xác nhận';
            case 'processing': return 'Đang chuẩn bị hàng';
            case 'shipping': return 'Đang giao hàng';
            case 'delivered': return 'Đã giao thành công';
            case 'cancelled': return 'Đã hủy đơn';
            case 'refunded': return 'Đã hoàn tiền';
            default: return status;
        }
    };

    const getStatusStyles = (status: Order['status'], cancellationRequested: boolean) => {
        if (cancellationRequested && status !== 'cancelled') {
            return { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' };
        }
        switch (status) {
            case 'pending':
                return { bg: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
            case 'confirmed':
                return { bg: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-500' };
            case 'processing':
                return { bg: 'bg-purple-50 text-purple-800 border-purple-200', dot: 'bg-purple-500' };
            case 'shipping':
                return { bg: 'bg-sky-50 text-sky-800 border-sky-200', dot: 'bg-sky-500' };
            case 'delivered':
                return { bg: 'bg-green-50 text-green-800 border-green-200', dot: 'bg-green-500' };
            case 'cancelled':
                return { bg: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-500' };
            default:
                return { bg: 'bg-gray-50 text-gray-800 border-gray-200', dot: 'bg-gray-500' };
        }
    };

    const filteredOrders = orders.filter((order) => {
        if (activeTab === 'all') return true;
        if (activeTab === 'pending') return order.status === 'pending';
        if (activeTab === 'confirmed') return order.status === 'confirmed';
        if (activeTab === 'processing') return order.status === 'processing';
        if (activeTab === 'shipping') return order.status === 'shipping';
        if (activeTab === 'delivered') return order.status === 'delivered';
        if (activeTab === 'cancelled') return order.status === 'cancelled';
        if (activeTab === 'request_cancel') return order.cancellationRequested && order.status !== 'cancelled';
        return true;
    });

    const tabs = [
        { id: 'all', name: 'Tất cả' },
        { id: 'pending', name: 'Chờ xác nhận' },
        { id: 'confirmed', name: 'Đã xác nhận' },
        { id: 'processing', name: 'Đang chuẩn bị' },
        { id: 'shipping', name: 'Đang giao' },
        { id: 'delivered', name: 'Đã giao' },
        { id: 'cancelled', name: 'Đã hủy' },
        { id: 'request_cancel', name: 'Yêu cầu hủy' }
    ];

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent" style={{ borderColor: `${PRIMARY} transparent transparent transparent` }}></div>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-[1280px] px-6 py-28 lg:px-8">
            <h1 className="font-inter text-3xl font-extrabold tracking-tight text-gray-900 mb-8">
                Đơn hàng của tôi
            </h1>

            {error && (
                <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 border border-red-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    {error}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="mb-8 border-b border-gray-200 overflow-x-auto whitespace-nowrap flex gap-6 scrollbar-none">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-4 text-sm font-semibold border-b-2 transition relative flex items-center gap-1.5 ${activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                        style={{
                            color: activeTab === tab.id ? PRIMARY : undefined,
                            borderColor: activeTab === tab.id ? PRIMARY : undefined
                        }}
                    >
                        {tab.name}
                        {/* Tab count badges */}
                        {(() => {
                            const count = orders.filter((o) => {
                                if (tab.id === 'all') return false;
                                if (tab.id === 'pending') return o.status === 'pending';
                                if (tab.id === 'confirmed') return o.status === 'confirmed';
                                if (tab.id === 'processing') return o.status === 'processing';
                                if (tab.id === 'shipping') return o.status === 'shipping';
                                if (tab.id === 'delivered') return o.status === 'delivered';
                                if (tab.id === 'cancelled') return o.status === 'cancelled';
                                if (tab.id === 'request_cancel') return o.cancellationRequested && o.status !== 'cancelled';
                                return false;
                            }).length;

                            return count > 0 ? (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {count}
                                </span>
                            ) : null;
                        })()}
                    </button>
                ))}
            </div>

            {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 py-16 px-4 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-primary" style={{ color: PRIMARY }}>
                        <span className="material-symbols-outlined text-3xl">receipt_long</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Không tìm thấy đơn hàng</h2>
                    <p className="text-gray-500 max-w-sm mb-8">
                        Bạn chưa có đơn hàng nào ở trạng thái này. Hãy tiếp tục khám phá các sản phẩm nổi bật của chúng tôi.
                    </p>
                    <Link
                        to="/categories"
                        className="rounded-full px-8 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 active:scale-98"
                        style={{ backgroundColor: PRIMARY }}
                    >
                        Khám phá sản phẩm
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredOrders.map((order) => {
                        const styles = getStatusStyles(order.status, order.cancellationRequested);
                        const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });

                        return (
                            <div key={order.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                                {/* Header of Order Card */}
                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 mb-4 text-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="font-extrabold text-gray-900">{order.orderNumber}</span>
                                        <span className="text-gray-400">|</span>
                                        <span className="text-gray-500">{dateStr}</span>
                                    </div>
                                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${styles.bg}`}>
                                        <span className={`h-2 w-2 rounded-full ${styles.dot}`}></span>
                                        {getStatusText(order.status, order.cancellationRequested)}
                                    </div>
                                </div>

                                {/* Items details */}
                                <div className="divide-y divide-gray-50">
                                    {order.items.map((item) => {
                                        const mainImg = item.product?.images?.[0]?.imageUrl || 'https://via.placeholder.com/150';
                                        return (
                                            <div key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center">
                                                    <img
                                                        src={mainImg}
                                                        alt={item.productName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-gray-900 line-clamp-1">{item.productName}</h4>
                                                    <p className="text-xs text-gray-400 mt-1">Số lượng: {item.quantity}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-sm font-bold text-gray-900 block">
                                                        {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Summary of Order Card */}
                                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
                                    <div>
                                        <span className="text-xs text-gray-400">Tổng thanh toán:</span>
                                        <span className="text-base font-extrabold text-primary block mt-0.5" style={{ color: PRIMARY }}>
                                            {Number(order.total).toLocaleString('vi-VN')}đ
                                        </span>
                                    </div>
                                    <Link
                                        to={`/orders/${order.id}`}
                                        className="rounded-full px-5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition active:scale-95 flex items-center gap-1"
                                    >
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        Xem chi tiết
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
