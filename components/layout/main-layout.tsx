'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import logo from '@/public/logo.webp';

/**
 * The authenticated chrome — sidebar, top bar, profile dialog — pulls in Motion,
 * ~17 icons and the profile editor. Loading it dynamically keeps all of that off
 * the public routes below, which render nothing but their own page content.
 *
 * SSR stays on, so authenticated pages still arrive as server-rendered HTML.
 */
const MainLayoutContent = dynamic(() =>
  import('./main-layout-content').then(m => m.MainLayoutContent),
);

/** Routes rendered without the dashboard chrome (login + token-linked pages). */
const BARE_PATHS = [
  '/login',
  '/client-portal',
  '/guest-view',
  '/order-client',
  '/order-employee',
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    return (
      <div className="font-sans text-secondary min-h-screen selection:bg-primary/20 selection:text-primary-dark">{children}</div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex h-screen overflow-hidden luxury-gradient justify-center items-center font-sans">
        <div className="animate-pulse">
          <Image src={logo} alt="Tanal Logo" width={80} height={100} className="object-contain" priority />
        </div>
      </div>
    }>
      <MainLayoutContent>{children}</MainLayoutContent>
    </Suspense>
  );
}
