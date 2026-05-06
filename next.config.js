/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: true, // ✅ Enable fast minification for 20-30% smaller bundle sizes
    experimental: {
        serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
        // Disable the client Router Cache for dynamic segments so revisiting a
        // page after a mutation always re-renders with fresh server data.
        // Static segments still cache for 3 minutes.
        staleTimes: {
            dynamic: 0,
            static: 180,
        },
    },
    // optional but recommended so node_modules is included correctly
    output: 'standalone'
}

module.exports = nextConfig
