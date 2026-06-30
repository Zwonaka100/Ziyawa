import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

const siteUrl = SITE_URL

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
