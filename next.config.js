/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: false,
    experimental: {
        serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    },
    // optional but recommended so node_modules is included correctly
    output: 'standalone'
}

module.exports = nextConfig
