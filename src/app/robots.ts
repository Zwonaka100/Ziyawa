import { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.co.za'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/api/',
          '/auth/callback',
          '/auth/reset-password',
          '/auth/mfa-challenge',
          '/auth/mfa-setup',
          '/payments/',
          '/messages/',
          '/profile',
          '/wallet',
          '/support/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
