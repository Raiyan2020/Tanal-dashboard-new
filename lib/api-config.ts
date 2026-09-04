/**
 * Single source of truth for where the backend lives.
 *
 * `NEXT_PUBLIC_API_BASE_URL` overrides it — set it in `.env.local`, which is
 * gitignored. The default points at production so a fresh checkout with no env
 * file still talks to a real API instead of silently issuing every request as a
 * relative path against the dashboard's own origin (which is what the previous
 * `?? ''` fallback did — a 404 from Next itself, with nothing to point at it).
 *
 * `next.config.ts` imports this too, so the CSP `connect-src`/`img-src` and
 * `images.remotePatterns` always allow whichever origin the client is actually
 * calling. Before, the origin was hardcoded separately there, and pointing
 * `NEXT_PUBLIC_API_BASE_URL` at another host left the CSP blocking every request
 * with no visible error.
 *
 * Keep this module dependency-free and free of browser/Node-only globals: it is
 * evaluated by the Next config loader, on the server, and in the browser bundle.
 */

/** Production API. Used whenever `NEXT_PUBLIC_API_BASE_URL` is unset or blank. */
export const DEFAULT_API_BASE_URL = 'https://portal.tanalevents.com/api/v1';

/** Trailing slashes are stripped so `${API_BASE_URL}${path}` never doubles up. */
function normalise(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

/**
 * A malformed value fails loudly rather than quietly falling back to production:
 * silently talking to the wrong backend is worse than not booting.
 */
function parse(baseUrl: string): URL {
  try {
    return new URL(baseUrl);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_API_BASE_URL is not a valid absolute URL: "${baseUrl}". ` +
      `Expected something like "${DEFAULT_API_BASE_URL}".`
    );
  }
}

/** Absolute base for every request, e.g. `https://portal.tanalevents.com/api/v1`. */
export const API_BASE_URL =
  normalise(process.env.NEXT_PUBLIC_API_BASE_URL) || DEFAULT_API_BASE_URL;

const apiUrl = parse(API_BASE_URL);

/** Scheme + host only, e.g. `https://portal.tanalevents.com` — for the CSP. */
export const API_ORIGIN = apiUrl.origin;

/** Split out for `images.remotePatterns`, which wants the parts separately. */
export const API_PROTOCOL = apiUrl.protocol.replace(':', '') as 'http' | 'https';
export const API_HOSTNAME = apiUrl.hostname;
