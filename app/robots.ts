import type { MetadataRoute } from 'next';

/**
 * The dashboard is an authenticated admin tool — nothing here belongs in a
 * search index. The client, guest and employee experiences are token-linked
 * Blade pages served by the backend, not routes in this app.
 *
 * This also fixes a concrete Lighthouse failure: without a real `/robots.txt`
 * the root-level `app/[slug]` route matched the request and answered with a
 * 200 HTML page, which crawlers and the audit both read as an invalid file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
