'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { COUNTRIES } from '@/app/clients/_client-form';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface EmployeeEditFormProps {
  employee?: any;
  onBack: () => void;
  onSave: (employee: any) => void;
}

interface FormValues {
  name: string;
  countryCode: string;
  phone: string;
  username: string;
  password?: string;
}

export function EmployeeEditForm({ employee, onBack, onSave }: EmployeeEditFormProps) {
  const { t, dir, language } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);

  const schema = React.useMemo(() => z.object({
    name: z.string()
      .min(1, { message: t('nameRequired') })
      .max(30, { message: t('nameMax30') }),
    countryCode: z.string().min(1),
    phone: z.string().min(1, { message: t('phoneRequired') }),
    username: z.string()
      .min(1, { message: t('usernameRequired') })
      .max(30, { message: t('usernameMax30') }),
    password: z.string().optional().refine(val => {
      if (!employee && (!val || val.trim() === '')) return false;
      return true;
    }, { message: t('passwordRequired') }),
  }), [t, employee]);

  // Initialize React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: employee?.name || '',
      countryCode: employee?.country_code || '+966',
      phone: employee?.phone || '',
      username: employee?.username || '',
      password: '',
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload: any = {
      name: values.name,
      username: values.username,
      country_code: values.countryCode,
      phone: values.phone,
    };
    // Only send password if filled (especially on edit)
    if (values.password && values.password.trim() !== '') {
      payload.password = values.password;
    }
    onSave(payload);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full text-start"
    >
      <div className="flex items-center justify-start mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
        >
          {dir === 'ltr' ? (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
          <span className="font-medium">{t('back' as any) || 'Back'}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {employee ? (t('editEmployee' as any) || 'Edit Employee') : (t('addEmployee' as any) || 'Add Employee')}
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
                    {t('fullName' as any) || 'Full Name'} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      {...field}
                      className="w-full bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
                {t('phoneNumber' as any) || 'Phone Number'} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 items-start">
                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <FormItem className="shrink-0 w-[140px]">
                      <div className="relative">
                        <FormControl>
                          <select
                            {...field}
                            className="w-full appearance-none bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 ps-3 pe-8 transition-all outline-none text-secondary text-sm font-medium h-[50px] cursor-pointer"
                          >
                            {COUNTRIES.map(c => (
                              <option key={c.iso} value={c.code}>
                                {c.flag} {c.code} ({dir === 'ltr' ? c.name : c.nameAr})
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none text-secondary/50">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="flex-1 min-w-0">
                      <FormControl>
                        <input
                          type="tel"
                          {...field}
                          dir="ltr"
                          placeholder="500000000"
                          className="w-full bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary h-[50px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
                    {t('username' as any) || 'Username'} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      {...field}
                      className="w-full bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
                    {t('password' as any) || 'Password'} {!employee && <span className="text-red-500">*</span>}
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <input
                        type={showPassword ? "text" : "password"}
                        {...field}
                        placeholder={employee ? (language === 'ar' ? 'اتركه فارغاً لإبقائه كما هو' : 'Leave empty to keep current') : ''}
                        className="w-full bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 pr-12 transition-all outline-none text-secondary font-mono"
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 px-3 flex items-center text-secondary/40 hover:text-secondary/60 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-secondary/10 mt-8 w-full">
              <button
                type="button"
                onClick={onBack}
                className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-secondary/20 bg-white/50 text-secondary hover:bg-white/80 font-medium transition-colors cursor-pointer"
              >
                {t('cancel' as any) || 'Cancel'}
              </button>
              <button
                type="submit"
                className="w-full sm:flex-1 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {t('save' as any) || 'Save'}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}
