/** @type {import('next').NextConfig} */

const securityHeaders = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-DNS-Prefetch-Control', value: 'on' },
    {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
    },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
    swcMinify: true, // ✅ Enable fast minification for 20-30% smaller bundle sizes
    // Strip console.* from production bundles (keep error/warn for diagnostics)
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production'
            ? { exclude: ['error', 'warn'] }
            : false,
    },
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: ['@sparticuz/chromium', 'puppeteer-core'],
    },
    images: {
        remotePatterns: [
            // OAuth provider avatars
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
        ],
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: securityHeaders,
            },
        ]
    },
    // optional but recommended so node_modules is included correctly
    output: 'standalone'
}

module.exports = nextConfig
