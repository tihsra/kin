import type { NextConfig } from 'next';

export default function config(): NextConfig {
  const apiUrl = process.env.API_URL || 'http://127.0.0.1:4000';
  const url = new URL(apiUrl);
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('API_URL must be an HTTP origin without a path, credentials, or query.');
  }
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('Set API_URL to the HTTPS backend origin for production builds.');
  }
  return {
    poweredByHeader: false,
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${url.origin}/api/:path*` }];
    },
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'X-Frame-Options', value: 'DENY' },
            ...(process.env.NODE_ENV === 'production'
              ? [
                  {
                    key: 'Strict-Transport-Security',
                    value: 'max-age=31536000',
                  },
                ]
              : []),
          ],
        },
      ];
    },
  };
}
