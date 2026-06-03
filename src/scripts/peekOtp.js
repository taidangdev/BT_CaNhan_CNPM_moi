/**
 * Đọc OTP đăng ký còn trong Redis (debug / local).
 * Usage: npm run otp:peek -- you@example.com
 */
require('dotenv').config();
const redisClient = require('../config/redis');
const {
    REGISTER_OTP_PREFIX,
    FORGOT_OTP_PREFIX,
    EDIT_PROFILE_OTP_PREFIX,
    otpKeysForEmailInput
} = require('../utils/otpRedisKeys');

const email = process.argv[2];
if (!email) {
    console.error('Usage: npm run otp:peek -- <email>');
    process.exit(1);
}

const run = async () => {
    try {
        await redisClient.connect();
        const prefixes = [
            { name: 'Register', value: REGISTER_OTP_PREFIX },
            { name: 'Forgot Password', value: FORGOT_OTP_PREFIX },
            { name: 'Edit Profile', value: EDIT_PROFILE_OTP_PREFIX }
        ];
        let found = false;

        for (const prefix of prefixes) {
            const keys = otpKeysForEmailInput(prefix.value, email);
            for (const key of keys) {
                const otp = await redisClient.get(key);
                if (otp) {
                    console.log(`[${prefix.name}] OTP cho ${email}: ${otp}`);
                    console.log(`Redis key: ${key}`);
                    found = true;
                }
            }
        }
        if (!found) {
            console.log(`Không có OTP nào cho email ${email} trong Redis.`);
            console.log('(Hết hạn TTL, sai email, hoặc chưa yêu cầu gửi OTP.)');
        }
    } catch (e) {
        console.error(e.message || e);
        process.exitCode = 1;
    } finally {
        await redisClient.quit().catch(() => {});
    }
};

run();
