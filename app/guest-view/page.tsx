'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { MapPin, Calendar, Clock, Download, Globe, Phone } from 'lucide-react';
import logo from "@/public/logo.webp";

export default function GuestViewPage() {
  const { t, dir, language, setLanguage } = useLanguage();
  const [showWarning, setShowWarning] = useState(false);
  const [hasDeclined, setHasDeclined] = useState(false);

  const eventNameEn = "Ahmed & Fatima's Wedding";
  const eventNameAr = "حفل زفاف أحمد وفاطمة";
  const venueEn = "Ritz Carlton, Grand Ballroom";
  const venueAr = "ريتز كارلتون, القاعة الكبرى";
  const dateEn = "Saturday, 15 June 2026";
  const dateAr = "السبت، ١٥ يونيو ٢٠٢٦";
  const timeEn = "8:00 PM";
  const timeAr = "٨:٠٠ مساءً";
  const guestNameEn = "Ahmed";
  const guestNameAr = "أحمد";
  const guestPhone = "+965 1234 5678";

  const hostPhone = "+965 9876 5432";

  return (
    <div className="min-h-screen luxury-gradient text-secondary relative pb-20">
      {/* Warning Popup */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl ring-1 ring-black/5"
          >
            <h3 className={cn("text-xl font-semibold mb-2", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {dir === 'ltr' ? 'Are you sure?' : 'هل أنت متأكد؟'}
            </h3>
            <p className="text-secondary/70 mb-6">
              {dir === 'ltr' ? 'Please confirm that you cannot make it to the event.' : 'يرجى تأكيد عدم تمكنك من الحضور للحفل.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-secondary/10 bg-secondary/5 font-medium hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                {dir === 'ltr' ? 'Cancel' : 'إلغاء'}
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  setHasDeclined(true);
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 font-medium text-white transition-colors shadow-sm cursor-pointer"
              >
                {dir === 'ltr' ? 'Confirm' : 'تأكيد'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Decorative Background Elements */}
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />

      {/* Top Navigation */}
      <div className="p-4 sm:p-6 w-full flex items-start justify-between z-20 relative max-w-5xl mx-auto">
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm ring-1 ring-black/5 flex items-center gap-2 hover:bg-white transition-colors cursor-pointer"
          title={dir === 'ltr' ? 'العربية' : 'English'}
        >
          <span className="font-medium text-sm text-secondary-dark">{dir === 'ltr' ? 'العربية' : 'English'}</span>
          <Globe className="w-4 h-4 text-secondary-dark/70" />
        </button>

        <div className="absolute left-1/2 -translate-x-1/2 top-4 sm:top-6 pt-1 sm:pt-0">
          <Image
            src={logo}
            alt="Tanal"
            width={60}
            height={60}
            className="object-contain w-14 h-14 sm:w-16 sm:h-16 opacity-80"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="w-10" /> {/* Spacer to balance layout */}
      </div>

      <div className="w-full max-w-md mx-auto px-4 z-10 relative">
        {hasDeclined ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-12 bg-white/40 backdrop-blur-sm p-8 rounded-3xl ring-1 ring-white/50 shadow-sm border border-white/60"
          >
            <h2 className={cn("text-2xl font-semibold text-primary-dark mb-4", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {dir === 'ltr' ? "Thank you for letting us know" : "شكراً لإعلامنا"}
            </h2>
            <p className="text-secondary/80 text-lg mb-8 leading-relaxed">
              {dir === 'ltr' ? "We're sorry that you can't make it." : "نأسف لعدم تمكنك من الحضور للحفل."}
            </p>

            <div className="bg-white/50 p-6 rounded-2xl ring-1 ring-white/50 border border-white/60">
              <p className="text-sm font-medium text-secondary/70 mb-5 leading-relaxed">
                {dir === 'ltr' ? "If you change your mind, don't hesitate to contact us:" : "إذا غيرت رأيك، لا تتردد في التواصل معنا:"}
              </p>

              <div className="flex justify-center">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm ring-1 ring-black/5 hover:bg-white transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primary-dark" />
                  </div>
                  <span className="font-mono text-secondary-dark font-medium" dir="ltr">{hostPhone}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-10 mt-6"
            >
              {/* Welcome Message */}
              <div className="mb-6">
                <p className={cn("text-secondary/70 text-lg", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
                  {dir === 'ltr' ? `Welcome, ${guestNameEn}` : `أهلاً بك، ${guestNameAr}`}
                </p>
              </div>

              <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary-dark text-sm font-medium mb-4">
                {dir === 'ltr' ? "You're Invited" : "أنت مدعو"}
              </div>
              <h1 className={cn("text-3xl sm:text-4xl font-medium text-primary-dark mb-4", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {dir === 'ltr' ? eventNameEn : eventNameAr}
              </h1>

              <div className="flex flex-col gap-3 text-secondary/80 mt-8 items-center bg-white/30 p-5 rounded-3xl ring-1 ring-white/50 shadow-sm border border-white/60">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary/70 shrink-0" />
                  <span className="font-medium">{dir === 'ltr' ? dateEn : dateAr}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary/70 shrink-0" />
                  <span className="font-medium">{dir === 'ltr' ? timeEn : timeAr}</span>
                </div>
                <div className="w-full h-px bg-secondary/10 my-1 max-w-[200px]" />
                <div className="flex items-center gap-3 mt-1">
                  <MapPin className="w-5 h-5 text-primary/70 shrink-0" />
                  <span className="font-medium">{dir === 'ltr' ? venueEn : venueAr}</span>
                </div>
                <button className="mt-3 bg-primary/10 hover:bg-primary/20 text-primary-dark rounded-xl py-2 px-6 text-sm font-medium transition-all shadow-sm flex items-center gap-2 cursor-pointer">
                  <MapPin className="w-4 h-4" />
                  {dir === 'ltr' ? 'Open Map' : 'فتح الخريطة'}
                </button>
              </div>
            </motion.div>

            {/* Invitation Card section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4 px-2">
                <h2 className={cn("text-xl font-semibold text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
                  {dir === 'ltr' ? 'Invitation Card' : 'بطاقة الدعوة'}
                </h2>
                <button className="bg-white/60 hover:bg-white border border-primary/10 text-primary-dark rounded-full p-2.5 transition-all shadow-sm flex items-center gap-2 cursor-pointer" title={dir === 'ltr' ? 'Download as PDF' : 'تحميل بصيغة PDF'}>
                  <Download className="w-4 h-4" />
                </button>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative aspect-[3/4] w-full max-w-[360px] mx-auto rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/50"
              >
                {/* Portrait Invitation Design Placeholder */}
                <Image
                  src="https://raiyansoft.com/wp-content/uploads/2026/05/1.png"
                  alt={dir === 'ltr' ? 'Invitation Design' : 'تصميم الدعوة'}
                  fill
                  className="object-cover pointer-events-none"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>

            {/* Guest Information Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-6 mb-8 flex flex-col items-center bg-white/40 backdrop-blur-sm p-6 rounded-3xl ring-1 ring-white/50 shadow-sm border border-white/60"
            >
              <p className="text-secondary/60 text-xs uppercase tracking-wider mb-3 font-medium">{dir === 'ltr' ? 'Guest Info' : 'معلومات الضيف'}</p>
              <p className={cn("text-xl font-semibold text-secondary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>{dir === 'ltr' ? guestNameEn : guestNameAr}</p>
              <p className="text-secondary/70 mt-1 mb-6 font-mono text-sm" dir="ltr">{guestPhone}</p>

              <button
                onClick={() => setShowWarning(true)}
                className="w-full bg-red-50/80 hover:bg-red-100 text-red-600 border border-red-200/60 rounded-xl py-3 px-4 font-medium transition-colors shadow-sm cursor-pointer flex justify-center items-center gap-2"
              >
                {dir === 'ltr' ? "I Can't Make It" : "أعتذر عن الحضور"}
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
