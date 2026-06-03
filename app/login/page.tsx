'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { t, dir } = useLanguage();
  const router = useRouter();
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('12345678');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center luxury-gradient relative overflow-hidden text-secondary">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply" />
      <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-8 sm:p-10 mx-4 glass-panel rounded-3xl relative z-10 crystal-accent"
      >
        <div className="flex flex-col items-center mb-8">
          <Image
            src="https://raiyansoft.com/wp-content/uploads/2026/05/logo-2.png"
            alt="Tanal Logo"
            width={72}
            height={72}
            className="mb-4 object-contain drop-shadow-md w-18 h-18"
            referrerPolicy="no-referrer"
          />
          <h1 className={cn("text-3xl tracking-wide font-medium text-primary-dark mb-2", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('tanal')}
          </h1>
          <p className="text-sm text-secondary/60 text-center">
            {t('enterDetails')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('email')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40 group-focus-within:text-primary transition-colors">
                <Mail className="w-5 h-5" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-11 rtl:pr-11 rtl:pl-4 transition-all outline-none text-secondary"
                placeholder="admin@tanal.com"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('password')}
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40 group-focus-within:text-primary transition-colors">
                <Lock className="w-5 h-5" />
              </div>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-11 rtl:pr-11 rtl:pl-4 transition-all outline-none text-secondary"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full mt-8 bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-2 group cursor-pointer"
          >
            {t('signIn')}
            {dir === 'ltr' ? (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            ) : (
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            )}
          </button>

          <button 
            type="button"
            onClick={() => router.push('/client-portal')}
            className="w-full mt-4 bg-white/60 hover:bg-white border border-primary/20 text-primary-dark rounded-xl py-3.5 font-medium transition-all shadow-sm hover:shadow-md flex justify-center items-center gap-2 cursor-pointer"
          >
            {dir === 'ltr' ? 'Temporary Client Link' : 'رابط العميل التجريبي'}
          </button>

          <button 
            type="button"
            onClick={() => router.push('/guest-view')}
            className="w-full mt-3 bg-secondary/5 hover:bg-secondary/10 border border-secondary/10 text-secondary-dark rounded-xl py-3.5 font-medium transition-all shadow-sm hover:shadow-md flex justify-center items-center gap-2 cursor-pointer"
          >
            {dir === 'ltr' ? 'Temporary Guest Link' : 'رابط الضيف التجريبي'}
          </button>
        </form>

      </motion.div>
    </div>
  );
}
