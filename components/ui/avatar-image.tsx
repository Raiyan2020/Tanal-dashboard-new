'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Renders an admin/user avatar from an arbitrary URL.
 *
 * Deliberately a plain `<img>` rather than `next/image`. Avatar URLs come from
 * the API record and are not guaranteed to sit on a host listed in
 * `images.remotePatterns` — historically they have included third-party hosts
 * such as i.vgy.me. `next/image` treats an unlisted hostname as a *hard runtime
 * error* that takes down the whole page, so one stale row in the database can
 * break an entire screen until someone edits next.config.ts and restarts.
 *
 * These render at 36–80px, so the optimiser buys very little here anyway. A
 * broken or dead URL (i.vgy.me links 404 once the upload is removed) falls back
 * to `fallback` instead of showing the browser's broken-image glyph.
 *
 * CSP still applies — `img-src` in next.config.ts governs which hosts may load.
 */
export function AvatarImage({
  src,
  alt,
  className,
  fallback,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  /** Rendered when `src` is empty or the image fails to load. */
  fallback: React.ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  // Track the URL that failed rather than a permanent boolean. A newly selected
  // local preview must still render even if the previous remote avatar failed.
  if (!src || failedSrc === src) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={() => setFailedSrc(src)}
      referrerPolicy="no-referrer"
      className={cn('object-cover', className)}
    />
  );
}
