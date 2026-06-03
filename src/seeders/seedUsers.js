const bcrypt = require('bcryptjs');
const { User, Major } = require('../models');
const users = require('./data/users.json');

const SALT_ROUNDS = 10;

/**
 * Idempotent: creates users when missing (matched by email).
 */
const { Op } = require('sequelize');

const seedUsers = async () => {
    await User.update({ role: 'customer' }, { where: { role: 'user' } });

    for (const row of users) {
        const { plainPassword, majorCode, ...attrs } = row;
        const password = await bcrypt.hash(plainPassword, SALT_ROUNDS);

        let majorId = null;
        if (majorCode) {
            const major = await Major.findOne({ where: { code: majorCode } });
            majorId = major?.id ?? null;
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: attrs.email },
                    { username: attrs.username }
                ]
            }
        });

        if (user) {
            await user.update({ ...attrs, majorId });
            console.log(`  · user: ${user.email}`);
        } else {
            const newUser = await User.create({
                ...attrs,
                majorId,
                password
            });
            console.log(`  + user: ${newUser.email}`);
        }
    }
};

module.exports = { seedUsers };
