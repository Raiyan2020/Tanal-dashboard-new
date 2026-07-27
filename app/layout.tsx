import type { Metadata } from 'next';
import { Inter, Playfair_Display, Tajawal } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/main-layout';
import { Toaster } from 'sonner';

/**
 * Font loading is tuned for the default UI language.
 *
 * `globals.css` forces `--font-sans` and `--font-serif` to Tajawal under
 * `[dir="rtl"]`, and the app ships `dir="rtl"` by default — so Inter and
 * Playfair render only after a user switches to English. `preload: false` keeps
 * their `@font-face` rules available while dropping the eager `<link rel=preload>`,
 * so Arabic sessions no longer download two font families they never paint.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  preload: false,
});

// 300 and 800 had no `font-light` / `font-extrabold` usage anywhere in the app.
// 600 is deliberately still absent: 146 `font-semibold` usages currently resolve
// to 700 through CSS weight matching, and adding a real 600 would restyle them.
const tajawal = Tajawal({
  weight: ['400', '500', '700'],
  subsets: ['arabic'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tanal - تنال | Luxury Wedding Management',
  description: 'A smart platform for managing weddings and events.',
  // Private admin tool: keep every route out of search results. The public
  // client/guest pages are reached through a one-off token link, so they are
  // covered by the same rule rather than being indexed.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${playfair.variable} ${tajawal.variable}`}>
      <body className="antialiased selection:bg-primary/20 selection:text-primary-dark" suppressHydrationWarning>
        <Toaster position="top-center" richColors closeButton />
        <LanguageProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </LanguageProvider>
      </body>
    </html>
  );
}
