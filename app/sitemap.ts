import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.kabusphere.app';
  const routes = ['', '/clubs', '/market', '/privacy', '/terms', '/cookies'];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '/market' ? 'hourly' : route === '/clubs' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/market' ? 0.9 : route === '/clubs' ? 0.8 : 0.5,
  }));
}
