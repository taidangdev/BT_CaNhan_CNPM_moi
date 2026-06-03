import React, { useState, useEffect } from 'react';

interface Address {
    id?: number;
    recipientName: string;
    phone: string;
    line1: string;
    line2?: string | null;
    ward: string;
    district: string;
    city: string;
    isDefault: boolean;
    label?: string | null;
}

interface AddressModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    address?: Address | null;
}

export default function AddressModal({ open, onClose, onSave, address }: AddressModalProps) {
    const [recipientName, setRecipientName] = useState('');
    const [phone, setPhone] = useState('');
    const [line1, setLine1] = useState('');
    const [line2, setLine2] = useState('');
    const [ward, setWard] = useState('');
    const [district, setDistrict] = useState('');
    const [city, setCity] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [label, setLabel] = useState('Home');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (address) {
            setRecipientName(address.recipientName || '');
            setPhone(address.phone || '');
            setLine1(address.line1 || '');
            setLine2(address.line2 || '');
            setWard(address.ward || '');
            setDistrict(address.district || '');
            setCity(address.city || '');
            setIsDefault(address.isDefault || false);
            setLabel(address.label || 'Home');
        } else {
            setRecipientName('');
            setPhone('');
            setLine1('');
            setLine2('');
            setWard('');
            setDistrict('');
            setCity('');
            setIsDefault(false);
            setLabel('Home');
        }
        setError(null);
    }, [address, open]);

    if (!open) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipientName.trim() || !phone.trim() || !line1.trim() || !ward.trim() || !district.trim() || !city.trim()) {
            setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await onSave({
                recipientName: recipientName.trim(),
                phone: phone.trim(),
                line1: line1.trim(),
                line2: line2.trim() || null,
                ward: ward.trim(),
                district: district.trim(),
                city: city.trim(),
                isDefault,
                label
            });
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || err?.message || 'Không thể lưu địa chỉ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl transition-all duration-300">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-gray-900">
                        {address ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tên người nhận *</label>
                            <input
                                type="text"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Số điện thoại *</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Số nhà, Tên đường *</label>
                            <input
                                type="text"
                                value={line1}
                                onChange={(e) => setLine1(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Căn hộ, Lầu (Tùy chọn)</label>
                            <input
                                type="text"
                                value={line2}
                                onChange={(e) => setLine2(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phường / Xã *</label>
                            <input
                                type="text"
                                value={ward}
                                onChange={(e) => setWard(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Quận / Huyện *</label>
                            <input
                                type="text"
                                value={district}
                                onChange={(e) => setDistrict(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tỉnh / Thành phố *</label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Nhãn địa chỉ</label>
                            <select
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                            >
                                <option value="Home">Nhà riêng</option>
                                <option value="Office">Văn phòng</option>
                                <option value="Dorm">Ký túc xá</option>
                                <option value="Other">Khác</option>
                            </select>
                        </div>
                        <div className="flex items-center pt-6 pl-4">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-sm font-semibold">
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    className="h-4.5 w-4.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                Đặt làm mặc định
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 rounded-full bg-primary py-3 text-sm font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60"
                        >
                            {loading ? 'Đang lưu...' : 'Lưu địa chỉ'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-full bg-gray-100 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 active:scale-95"
                        >
                            Hủy
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
