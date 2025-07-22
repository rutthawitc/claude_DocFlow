"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nextConfig = {
    headers: async () => [
        {
            source: '/(.*)',
            headers: [
                {
                    key: 'Content-Security-Policy',
                    value: "default-src 'self'",
                },
                {
                    key: 'X-XSS-Protection',
                    value: '1; mode=block',
                },
                {
                    key: 'X-Frame-Options',
                    value: 'SAMEORIGIN',
                },
                {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff',
                },
                {
                    key: 'Referrer-Policy',
                    value: 'same-origin',
                },
            ],
        },
    ],
};
exports.default = nextConfig;
