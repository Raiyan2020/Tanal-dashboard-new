'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import {
  Info,
  ShieldCheck,
  FileText,
  Phone,
  Globe,
  Menu,
  CalendarDays,
} from 'lucide-react';
import logo from "@/public/logo.webp"

export default function ClientPortal() {
  const { t, language, setLanguage, dir } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const navItems = [
    { icon: Info, labelEn: 'About Us', labelAr: 'معلومات عنا' },
    { icon: ShieldCheck, labelEn: 'Privacy Policy', labelAr: 'سياسة الخصوصية' },
    { icon: FileText, labelEn: 'Terms & Conditions', labelAr: 'الشروط والأحكام' },
    { icon: Phone, labelEn: 'Contact Us', labelAr: 'اتصل بنا' },
  ];

  return (
    <div className="flex h-screen luxury-gradient overflow-hidden font-sans text-secondary pb-12">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-secondary/20 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          width: sidebarOpen ? 280 : 88,
          x: sidebarOpen ? 0 : (dir === 'rtl' ? (typeof window !== 'undefined' && window.innerWidth < 1024 ? 280 : 0) : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -280 : 0))
        }}
        className={cn(
          "fixed top-0 bottom-0 z-50 flex flex-col pt-6 pb-4 transition-transform lg:relative lg:translate-x-0",
          "glass-panel border-r-0 lg:border-r border-white/60",
          dir === 'rtl' ? 'right-0 border-l border-white/60 lg:border-r-0 lg:border-l' : 'left-0 border-r border-white/60 lg:border-r',
          !sidebarOpen && "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        )}
      >
        <div className="flex items-center px-6 mb-8 mt-2 overflow-hidden justify-between w-full h-8 relative">
          <div className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Tanal Logo"
              width={30}
              height={40}
              className="shrink-0 object-contain drop-shadow-sm w-[30px] h-10"
              referrerPolicy="no-referrer"
            />
            <motion.span
              animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }}
              className={cn("whitespace-nowrap text-xl font-medium tracking-wide text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic')}
            >
              {t('tanal')}
            </motion.span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto overflow-x-hidden scrollbar-hide py-2">

          {navItems.map((item, idx) => (
            <button
              key={idx}
              className="flex items-center w-full gap-4 px-3 py-3 rounded-2xl transition-all duration-300 text-secondary hover:bg-white/30 group cursor-pointer relative overflow-hidden"
              title={!sidebarOpen ? (dir === 'ltr' ? item.labelEn : item.labelAr) : undefined}
            >
              <item.icon className="w-5 h-5 shrink-0 z-10" strokeWidth={1.5} />
              <motion.span
                animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }}
                className="font-medium text-sm text-secondary/80 whitespace-nowrap z-10 text-left rtl:text-right"
              >
                {dir === 'ltr' ? item.labelEn : item.labelAr}
              </motion.span>
            </button>
          ))}
        </nav>

        <div className="px-4 mt-auto pt-4 border-t border-secondary/5 mx-4">
          <button
            onClick={toggleLanguage}
            className="flex items-center w-full gap-4 px-3 py-3 rounded-2xl transition-all duration-300 text-secondary hover:bg-white/30 group cursor-pointer relative overflow-hidden"
            title={!sidebarOpen ? (dir === 'ltr' ? 'العربية' : 'English') : undefined}
          >
            <Globe className="w-5 h-5 shrink-0 z-10" strokeWidth={1.5} />
            <motion.span
              animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? "auto" : 0 }}
              className="font-medium text-sm text-secondary/80 whitespace-nowrap z-10 text-left rtl:text-right"
            >
              {dir === 'ltr' ? 'العربية' : 'English'}
            </motion.span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-multiply" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply" />

        <header className="h-20 lg:h-24 px-6 lg:px-10 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2.5 rounded-2xl text-secondary bg-white/40 hover:bg-white/60 transition-colors shadow-[0_4px_12px_rgba(54,45,35,0.02)] ring-1 ring-white/60 focus:outline-none cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Image
              src={logo}
              alt="Tanal Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 lg:pl-12 rtl:lg:pl-10 rtl:lg:pr-12">
          <div className="max-w-4xl mx-auto pb-12">
            {/* No client-portal endpoint exists yet, so the portal shows an
                honest empty state instead of a fabricated event. */}
            <div className="bg-white rounded-3xl p-10 sm:p-16 shadow-[0_4px_24px_rgba(54,45,35,0.03)] border border-secondary/5 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#F3EBE1] flex items-center justify-center">
                <CalendarDays className="w-8 h-8 text-primary-dark" />
              </div>
              <h2 className={cn("text-xl sm:text-2xl text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {t('noEventData')}
              </h2>
              <p className="text-secondary/60 max-w-md text-sm leading-relaxed">
                {t('noEventDataHint')}
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
