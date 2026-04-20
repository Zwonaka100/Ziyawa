import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.co.za'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/ziwaphi`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteUrl}/artists`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/crew`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${siteUrl}/for/groovists`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/for/organizers`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/for/artists`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/for/crew`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/refunds`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${siteUrl}/auth/signin`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${siteUrl}/auth/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ]

  // Published events
  const { data: events } = await supabase
    .from('events')
    .select('id, updated_at')
    .in('state', ['published', 'locked'])
    .order('event_date', { ascending: false })
    .limit(500)

  const eventPages: MetadataRoute.Sitemap = (events || []).map((e) => ({
    url: `${siteUrl}/events/${e.id}`,
    lastModified: new Date(e.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Artists
  const { data: artists } = await supabase
    .from('artists')
    .select('id, updated_at')
    .limit(500)

  const artistPages: MetadataRoute.Sitemap = (artists || []).map((a) => ({
    url: `${siteUrl}/artists/${a.id}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...eventPages, ...artistPages]
}
