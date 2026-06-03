const { Product, ProductImage, ProductMajor } = require('../models');
const products = require('./data/products.json');

const seedProducts = async (categorySlugToId, majorCodeToId) => {
    for (const row of products) {
        const categoryId = categorySlugToId[row.categorySlug];
        if (!categoryId) {
            console.warn(`  ! skip product ${row.slug}: unknown category ${row.categorySlug}`);
            continue;
        }

        const { image, majorCodes, categorySlug, ...productData } = row;

        const [product, created] = await Product.findOrCreate({
            where: { slug: row.slug },
            defaults: {
                ...productData,
                categoryId,
                productType: row.productType || 'standard',
                status: 'active',
                viewCount: 0,
                soldCount: 0,
                publishedAt: new Date()
            }
        });

        if (!created) {
            await product.update({
                ...productData,
                categoryId,
                productType: row.productType || 'standard',
                status: 'active',
                viewCount: 0,
                soldCount: 0
            });
        }

        await ProductImage.destroy({ where: { productId: product.id } });
        await ProductImage.create({
            productId: product.id,
            url: image,
            altText: row.name,
            sortOrder: 0,
            isPrimary: true
        });

        await ProductMajor.destroy({ where: { productId: product.id } });
        for (const code of majorCodes || []) {
            const majorId = majorCodeToId[code];
            if (majorId) {
                await ProductMajor.create({ productId: product.id, majorId });
            }
        }

        console.log(`  ${created ? '+' : '·'} product: ${row.slug}`);
    }
};

module.exports = { seedProducts };
