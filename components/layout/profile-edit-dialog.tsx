'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import {
  User,
  Mail,
  Lock,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { AvatarImage } from '@/components/ui/avatar-image';
import { cn } from '@/lib/utils';
import { ApiError, updateAdminPassword, updateProfile } from '@/lib/api';
import { getAdmin, getToken, saveAdmin } from '@/lib/auth';
import type { Admin } from '@/lib/api';

// Shadcn UI components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/* ─── Zod schema ─────────────────────────────────────────────── */
/**
 * Mirrors the two endpoints this dialog talks to. The password trio is optional
 * as a group: leaving all three blank saves only the profile. The length bounds
 * are the API's own (`min:6|max:100`) so the form never rejects a password the
 * server would accept, nor accepts one it would not.
 */
const schema = z
  .object({
    name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
    email: z.string().email('البريد الإلكتروني غير صالح'),
    current_password: z.string().optional(),
    password: z.string().optional(),
    password_confirmation: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const { current_password, password, password_confirmation } = values;
    if (!current_password && !password && !password_confirmation) return;

    if (!current_password) {
      ctx.addIssue({
        code: 'custom',
        path: ['current_password'],
        message: 'أدخل كلمة المرور الحالية لتغييرها',
      });
    }
    if (!password || password.length < 6) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل',
      });
    } else if (password.length > 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['password'],
        message: 'كلمة المرور الجديدة يجب ألا تتجاوز 100 حرف',
      });
    }
    if (password !== password_confirmation) {
      ctx.addIssue({
        code: 'custom',
        path: ['password_confirmation'],
        message: 'تأكيد كلمة المرور غير مطابق',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

/* ─── Props ──────────────────────────────────────────────────── */
interface ProfileEditDialogProps {
  open: boolean;
  onClose: () => void;
  admin: Admin | null;
  onSuccess: (updated: Admin) => void;
}

/* ─── Component ──────────────────────────────────────────────── */
export function ProfileEditDialog({
  open,
  onClose,
  admin,
  onSuccess,
}: ProfileEditDialogProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePreviewUrlRef = useRef<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: admin?.name ?? '',
      email: admin?.email ?? '',
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  useEffect(() => () => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
    }
    const previewUrl = URL.createObjectURL(file);
    imagePreviewUrlRef.current = previewUrl;
    setImageFile(file);
    setImagePreview(previewUrl);
  };

  const onSubmit = useCallback(async (values: FormValues) => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      const token = getToken();
      if (!token) throw new Error('غير مخوّل');

      const res = await updateProfile(
        {
          name: values.name,
          email: values.email,
          ...(imageFile ? { image: imageFile } : {}),
        },
        token
      );

      /*
       * The password has its own endpoint and its own failure mode (a wrong
       * current password is a 422 on that field). It runs after the profile
       * save so a rejected password never discards the name/email edit.
       */
      if (values.password) {
        try {
          await updateAdminPassword(
            {
              current_password: values.current_password ?? '',
              password: values.password,
              password_confirmation: values.password_confirmation ?? '',
            },
            token
          );
        } catch (err) {
          if (err instanceof ApiError && err.fieldError('current_password')) {
            form.setError('current_password', {
              message: err.fieldError('current_password'),
            });
          }
          throw err;
        }
      }

      // The response is the full updated admin, so it replaces the cached copy
      // outright — merging only the image would leave a stale name in the
      // sidebar until the next sign-in.
      const cachedAdmin = getAdmin<Admin>() ?? admin;
      const updatedAdmin = { ...cachedAdmin, ...res.data };
      saveAdmin(updatedAdmin);
      onSuccess(updatedAdmin);
      form.resetField('current_password');
      form.resetField('password');
      form.resetField('password_confirmation');
      setStatus('success');
      setTimeout(onClose, 1200);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    }
  }, [admin, form, imageFile, onClose, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-md w-full bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl overflow-hidden p-0 gap-0">
        {/* Decorative gradient top bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 via-accent/60 to-primary/60" />

        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-secondary/8">
          <DialogTitle className="text-base font-semibold text-secondary">تعديل الملف الشخصي</DialogTitle>
          <DialogDescription className="text-xs text-secondary/50 mt-0.5">تحديث بيانات الحساب</DialogDescription>
        </DialogHeader>

        {/* Form Body */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
            
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3 pb-2">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-white shadow-lg">
                  <AvatarImage
                    src={imagePreview ?? admin?.image}
                    alt="avatar"
                    className="w-full h-full"
                    fallback={
                      <span className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-primary/40" />
                      </span>
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-dark transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
              {imageFile && (
                <span className="text-xs text-secondary/50 truncate max-w-[200px]">{imageFile.name}</span>
              )}
            </div>

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-secondary/70">الاسم</FormLabel>
                  <div className="relative">
                    <User className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 ltr:left-3 ltr:right-auto w-4 h-4 text-secondary/30" />
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="الاسم الكامل"
                        className="pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-sm text-secondary"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-secondary/70">البريد الإلكتروني</FormLabel>
                  <div className="relative">
                    <Mail className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 ltr:left-3 ltr:right-auto w-4 h-4 text-secondary/30" />
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        dir="ltr"
                        placeholder="admin@example.com"
                        className="pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-sm text-secondary"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password change — optional as a group: all three blank saves
                only the profile. */}
            <div className="pt-1 border-t border-secondary/8" />
            <p className="text-xs text-secondary/45 -mb-1">
              تغيير كلمة المرور <span className="text-secondary/35">(اتركها فارغة للإبقاء على الحالية)</span>
            </p>
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-secondary/70">كلمة المرور الحالية</FormLabel>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 ltr:left-3 ltr:right-auto w-4 h-4 text-secondary/30" />
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        dir="ltr"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-sm text-secondary"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-secondary/70">كلمة المرور الجديدة</FormLabel>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 ltr:left-3 ltr:right-auto w-4 h-4 text-secondary/30" />
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        dir="ltr"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-sm text-secondary"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password_confirmation"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-secondary/70">تأكيد كلمة المرور الجديدة</FormLabel>
                  <div className="relative">
                    <Lock className="absolute top-1/2 -translate-y-1/2 right-3 rtl:right-3 ltr:left-3 ltr:right-auto w-4 h-4 text-secondary/30" />
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        dir="ltr"
                        autoComplete="new-password"
                        placeholder="••••••••"
                        className="pr-9 pl-3 rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 text-sm text-secondary"
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* API error */}
            {status === 'error' && errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 bg-red-50 border border-red-200/60 text-red-600 text-xs rounded-xl px-3 py-2.5"
              >
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Success */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 text-emerald-600 text-xs rounded-xl px-3 py-2.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>تم تحديث الملف الشخصي بنجاح</span>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-xl"
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="flex-1 rounded-xl"
              >
                {status === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  'حفظ التغييرات'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
