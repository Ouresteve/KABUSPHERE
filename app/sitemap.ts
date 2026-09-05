import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kabusphere.vercel.app';
  const routes = ['', '/market', '/privacy', '/terms', '/cookies'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/market' ? 'hourly' : 'monthly',
    priority: route === '' ? 1 : route === '/market' ? 0.9 : 0.5,
  }));
}
