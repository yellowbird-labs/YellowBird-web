import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://yellowbird.amaanworks.me/docs/sitemap-index.xml',
  };
}
