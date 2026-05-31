const userService = require('../services/user.service');
const { successResponse } = require('../utils/responseHandler');

const getMe = async (req, res, next) => {
    try {
        const user = await userService.getUserPublicById(req.user.id);
        return successResponse(res, 200, 'OK', { user });
    } catch (error) {
        next(error);
    }
};

const requestEditProfileOtp = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await userService.requestEditProfileOtp(userId);
        return successResponse(res, 200, result.message);
    } catch (error) {
        next(error);
    }
};

/**
 * Controller: Cập nhật thông tin User (Edit Profile)
 * - Người dùng chỉ có thể cập nhật thông tin của chính họ (trừ phi là admin)
 * - Yêu cầu phải xác thực qua auth.middleware (req.user phải tồn tại)
 */
const editProfile = async (req, res, next) => {
    try {
        // Lấy ID user từ token (được set trong verifyToken middleware)
        const userId = req.user.id; 
        
        // Lấy dữ liệu update từ body request
        // Cần đảm bảo frontend chỉ gửi các trường được phép cập nhật
        const { otp, ...updateData } = req.body;

        // Xóa các trường không cho phép update trực tiếp qua API này
        delete updateData.password;
        delete updateData.role; 
        delete updateData.id;
        delete updateData.email; // Không cho đổi email qua API này để tránh phức tạp hóa OTP logic
        delete updateData.username; // Không cho đổi username

        // Gọi service xử lý nghiệp vụ
        const updatedUser = await userService.updateUserProfile(userId, updateData, otp);

        // Trả về response thành công
        return successResponse(res, 200, 'Profile updated successfully', {
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                phone: updatedUser.phone,
                address: updatedUser.address,
                role: updatedUser.role,
                status: updatedUser.status
            }
        });
    } catch (error) {
        next(error); // Đẩy lỗi cho Error Middleware xử lý
    }
};

const toggleWishlist = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const productId = Number(req.params.productId);
        const result = await userService.toggleWishlist(userId, productId);
        return successResponse(res, 200, result.message, { inWishlist: result.inWishlist });
    } catch (error) {
        next(error);
    }
};

const getWishlist = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const products = await userService.getWishlist(userId);
        return successResponse(res, 200, 'OK', { products });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMe,
    requestEditProfileOtp,
    editProfile,
    toggleWishlist,
    getWishlist
};
