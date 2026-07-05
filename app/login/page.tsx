'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Mail, Lock, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { loginAdmin } from '@/lib/api';
import { saveToken, saveAdmin, savePermissions } from '@/lib/auth';
import logo from "@/public/logo.webp"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface FormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { t, dir, language, setLanguage } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = React.useMemo(() => z.object({
    email: z.string().min(1, { message: dir === 'ltr' ? 'Email is required' : 'البريد الإلكتروني مطلوب' }).email({ message: t('invalidEmail') }),
    password: z.string().min(1, { message: t('passwordRequired') }),
  }), [t, dir]);

  // Initialize React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setLoading(true);

    try {
      const res = await loginAdmin(values.email, values.password);
      const { token, admin, permissions } = res.data;

      // Persist auth data (localStorage + cookies for middleware)
      saveToken(token);
      saveAdmin(admin);
      savePermissions(permissions ?? []);

      // Redirect to dashboard
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center luxury-gradient relative overflow-hidden text-secondary">
      {/* Language Toggle Button */}
      <div className={cn("absolute top-6 z-20", dir === 'ltr' ? 'right-6' : 'left-6')}>
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className="px-4 py-2 bg-white/50 hover:bg-white/80 border border-white/60 text-secondary rounded-xl text-sm font-medium transition-all shadow-sm cursor-pointer hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5"
        >
          <span className="text-xs">🌐</span>
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

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
            src={logo}
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 text-start">
            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-red-50/80 border border-red-200/60 text-red-700 text-sm rounded-xl px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
                    {t('email')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40 group-focus-within:text-primary transition-colors">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input
                        type="email"
                        {...field}
                        className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-11 rtl:pr-11 rtl:pl-4 transition-all outline-none text-secondary"
                        placeholder="admin@tanal.com"
                        dir="ltr"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
                    {t('password')}
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40 group-focus-within:text-primary transition-colors">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        {...field}
                        className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-11 rtl:pr-11 rtl:pl-4 transition-all outline-none text-secondary"
                        placeholder="••••••••"
                        dir="ltr"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-primary hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl py-3.5 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex justify-center items-center gap-2 group cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t('signIn')}
                  {dir === 'ltr' ? (
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  )}
                </>
              )}
            </button>
          </form>
        </Form>

      </motion.div>
    </div>
  );
}
