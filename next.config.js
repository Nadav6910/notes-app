/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: true, // ✅ Enable fast minification for 20-30% smaller bundle sizes
    experimental: {
        serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    },
    // optional but recommended so node_modules is included correctly
    output: 'standalone'
}

module.exports = nextConfig
