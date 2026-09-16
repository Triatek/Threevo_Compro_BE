/** For admin & auth responses: never cache. */
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

/** For public GET endpoints: short browser/CDN cache. */
export function publicCache(req, res, next) {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  }
  next();
}
