/**
 * Extracts tenant slug from Express 5 request.
 *
 * Express 5 router-level middleware does not receive req.params correctly
 * when mounted with app.use('/path/:slug', router). This utility parses
 * the slug from the full URL instead.
 *
 * @param originalUrl - req.originalUrl (the full URL path)
 * @returns The tenant slug or null if not found
 *
 * Examples:
 *   /admin/portals/koltepatil/fields/bulk → slug at index 2
 *   /admin/portals/koltepatil → slug at index 2
 *   /api/koltepatil/projects → slug at index 1
 */
export function extractSlug(originalUrl: string): string | null {
  const fullPath = originalUrl.replace(/^\//, '');
  const segments = fullPath.split('/').filter(Boolean);

  // Determine slug position based on URL structure
  if (segments[0] === 'admin' && segments[1] === 'portals') {
    return segments[2] || null; // /admin/portals/:slug/...
  } else if (segments[0] === 'api') {
    return segments[1] || null; // /api/:slug/...
  }

  return null;
}
