/**
 * Only allow in-app paths as post-login destinations ("/packages?x=1"),
 * never absolute or protocol-relative URLs (open-redirect protection).
 */
export function safeNext(next, fallback = '/') {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/^\/(login|register)\b/.test(next)) return fallback;
  return next;
}
