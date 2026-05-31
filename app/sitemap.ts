import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'https://petitelavande.com'
  const now = new Date()
  return [
    { url: base,                          lastModified: now, changeFrequency: 'weekly',  priority: 1   },
    { url: `${base}/build`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/guide`,               lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/gift-cards`,          lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/track`,               lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/account`,             lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/legal/terms`,         lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/legal/privacy`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${base}/legal/returns`,       lastModified: now, changeFrequency: 'yearly',  priority: 0.2 },
  ]
}
