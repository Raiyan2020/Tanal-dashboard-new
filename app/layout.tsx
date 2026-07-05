import type { Metadata } from 'next';
import { Inter, Playfair_Display, Tajawal } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/main-layout';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const tajawal = Tajawal({
  weight: ['300', '400', '500', '700', '800'],
  subsets: ['arabic'],
  variable: '--font-tajawal',
});

export const metadata: Metadata = {
  title: 'Tanal - تنال | Luxury Wedding Management',
  description: 'A smart platform for managing weddings and events.',
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
