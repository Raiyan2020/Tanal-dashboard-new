'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  ImageIcon, Sparkles, LayoutGrid, Phone, ArrowLeft, ArrowRight,
  Loader2, Link, Footprints, CalendarDays, CheckCircle2
} from 'lucide-react';
import { getToken } from '@/lib/auth';

// Import modular section components
import HeroSection from './sections/HeroSection';
import HowItWorksSection from './sections/HowItWorksSection';
import FeaturesSection from './sections/FeaturesSection';
import PortfolioSection from './sections/PortfolioSection';
import SocialLinksSection from './sections/SocialLinksSection';
import FooterSection from './sections/FooterSection';
import ContactSection from './sections/ContactSection';
import EventTypesSection from './sections/EventTypesSection';

const SECTIONS = [
  { id: 'hero', titleKey: 'lpHeroSection', descKey: 'lpHeroDesc', icon: ImageIcon },
  { id: 'how-it-works', titleKey: 'lpHowItWorks', descKey: 'lpHowItWorksDesc', icon: CheckCircle2 },
  { id: 'features', titleKey: 'lpFeatures', descKey: 'lpFeaturesDesc', icon: Sparkles },
  { id: 'portfolio', titleKey: 'lpPortfolio', descKey: 'lpPortfolioDesc', icon: LayoutGrid },
  { id: 'social-links', titleKey: 'lpSocialLinks', descKey: 'lpSocialLinksDesc', icon: Link },
  { id: 'footer', titleKey: 'lpFooter', descKey: 'lpFooterDesc', icon: Footprints },
  { id: 'contact', titleKey: 'lpContact', descKey: 'lpContactDesc', icon: Phone },
  { id: 'event-types', titleKey: 'lpEventTypes', descKey: 'lpEventTypesDesc', icon: CalendarDays },
];

function LandingPageContent() {
  const { dir, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('s');
  const token = getToken() ?? '';

  const BackIcon = dir === 'ltr' ? ArrowLeft : ArrowRight;
  const currentSection = SECTIONS.find(s => s.id === activeSection);

  const renderSection = () => {
    switch (activeSection) {
      case 'hero':
        return <HeroSection token={token} />;
      case 'how-it-works':
        return <HowItWorksSection token={token} />;
      case 'features':
        return <FeaturesSection token={token} />;
      case 'portfolio':
        return <PortfolioSection token={token} />;
      case 'social-links':
        return <SocialLinksSection token={token} />;
      case 'footer':
        return <FooterSection token={token} />;
      case 'contact':
        return <ContactSection token={token} />;
      case 'event-types':
        return <EventTypesSection token={token} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 px-2">
        <AnimatePresence mode="wait">
          {activeSection && (
            <motion.button
              key="back"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => router.push('/landingPage')}
              className="p-2.5 rounded-xl bg-white/40 hover:bg-white/60 shadow-sm transition-colors text-secondary cursor-pointer shrink-0"
            >
              <BackIcon className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
        <div>
          <h2 className={cn('text-2xl font-semibold text-secondary flex items-center gap-2', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
            {currentSection ? (
              <>
                <currentSection.icon className="w-6 h-6 text-primary shrink-0" />
                {t(currentSection.titleKey)}
              </>
            ) : (
              t('landingPage')
            )}
          </h2>
          <p className="text-sm text-secondary/55 mt-0.5">
            {currentSection ? t(currentSection.descKey) : t('landingPageDescription')}
          </p>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence mode="wait">
        {!activeSection ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
          >
            {SECTIONS.map((section, i) => (
              <motion.button
                key={section.id}
                onClick={() => router.push(`/landingPage?s=${section.id}`)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="p-6 rounded-3xl glass-panel text-start hover:bg-white/60 transition-all shadow-sm border border-secondary/5 group flex flex-col gap-4 cursor-pointer hover:-translate-y-0.5"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <section.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-secondary mb-1">{t(section.titleKey)}</h3>
                  <p className="text-sm text-secondary/55 leading-relaxed">{t(section.descKey)}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`s-${activeSection}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 min-h-[60vh]"
          >
            {renderSection()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
        </div>
      }
    >
      <LandingPageContent />
    </Suspense>
  );
}
