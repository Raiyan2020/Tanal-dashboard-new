'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { X, UploadCloud, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type CreateServicePayload } from '@/lib/api';

export interface ServiceFormData {
  id?: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  sort_order: number;
  image?: File | null;
  image_url?: string | null;
}

interface ServiceModalProps {
  mode: 'add' | 'edit';
  initial?: ServiceFormData;
  onClose: () => void;
  onSave: (payload: CreateServicePayload) => void;
  language: string;
}

export function ServiceModal({
  mode, initial, onClose, onSave, language
}: ServiceModalProps) {
  const { t, dir } = useLanguage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url || null);
  const [imageError, setImageError] = useState<string | null>(null);

  const schema = React.useMemo(() => z.object({
    name_ar: z.string().min(1, { message: dir === 'ltr' ? 'Arabic name is required' : 'الاسم بالعربية مطلوب' }),
    name_en: z.string().min(1, { message: dir === 'ltr' ? 'English name is required' : 'الاسم بالإنجليزية مطلوب' }),
    description_ar: z.string().min(1, { message: dir === 'ltr' ? 'Arabic description is required' : 'الوصف بالعربية مطلوب' }),
    description_en: z.string().min(1, { message: dir === 'ltr' ? 'English description is required' : 'الوصف بالإنجليزية مطلوب' }),
    sort_order: z.preprocess(
      (val) => (val === '' || val === undefined) ? 0 : Number(val),
      z.number().int().min(0, { message: dir === 'ltr' ? 'Must be 0 or greater' : 'يجب أن يكون 0 أو أكثر' })
    ).default(0),
  }), [dir]);

  interface FormValues {
    name_ar: string;
    name_en: string;
    description_ar: string;
    description_en: string;
    sort_order: number;
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name_ar: initial?.name_ar || '',
      name_en: initial?.name_en || '',
      description_ar: initial?.description_ar || '',
      description_en: initial?.description_en || '',
      sort_order: initial?.sort_order ?? 0,
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setImageError(null);
    }
  };

  const onSubmit = (values: FormValues) => {
    if (!imagePreview) {
      setImageError(dir === 'ltr' ? 'Service image is required' : 'صورة الخدمة مطلوبة');
      return;
    }
    setImageError(null);
    onSave({
      name_ar: values.name_ar,
      name_en: values.name_en,
      description_ar: values.description_ar,
      description_en: values.description_en,
      sort_order: values.sort_order,
      image: imageFile || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-secondary/10 w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col text-start">
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10 shrink-0">
          <h3 className="font-semibold text-secondary text-base">
            {mode === 'add' ? t('addNewService') : t('editService')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5 text-secondary/60" />
          </button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">

              {/* Name Ar */}
              <FormField
                control={form.control}
                name="name_ar"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                      {t('serviceNameAr')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        dir="rtl"
                        placeholder="مثال: تصوير فوتوغرافي"
                        {...field}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary font-arabic"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name En */}
              <FormField
                control={form.control}
                name="name_en"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                      {t('serviceNameEn')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        dir="ltr"
                        placeholder="e.g. Professional Photography"
                        {...field}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Desc Ar */}
              <FormField
                control={form.control}
                name="description_ar"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                      {t('serviceDescAr')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        dir="rtl"
                        placeholder="اكتب وصفاً للخدمة وتفاصيلها هنا..."
                        {...field}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary resize-none font-arabic"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Desc En */}
              <FormField
                control={form.control}
                name="description_en"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                      {t('serviceDescEn')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <textarea
                        rows={3}
                        dir="ltr"
                        placeholder="Write service description and details here..."
                        {...field}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary resize-none"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sort Order */}
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                      {t('sortOrder')}
                    </FormLabel>
                    <FormControl>
                      <input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                  {t('serviceImage')} <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-secondary/20 bg-secondary/5 aspect-video flex items-center justify-center cursor-pointer" onClick={() => document.getElementById('svc-img')?.click()}>
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="object-contain max-h-full max-w-full p-2" />
                  ) : (
                    <div className="flex flex-col items-center text-secondary/40">
                      <UploadCloud className="w-8 h-8 mb-1" />
                      <span className="text-xs">{t('clickToUpload')}</span>
                    </div>
                  )}
                </div>
                <input type="file" id="svc-img" accept="image/*" onChange={handleImageChange} className="hidden" />
                {imageError && <p className="text-xs text-red-500 mt-1 font-semibold">{imageError}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary/10 bg-secondary/5 shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary/70 bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
                {t('cancel')}
              </button>
              <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors cursor-pointer shadow-md">
                {t('save')}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

interface DeleteServiceModalProps {
  onClose: () => void;
  onConfirm: () => void;
  language: string;
}

export function DeleteServiceModal({ onClose, onConfirm, language }: DeleteServiceModalProps) {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden text-center p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h3 className="font-semibold text-secondary text-lg mb-1">{t('deleteService')}</h3>
          <p className="text-sm text-secondary/60">{t('deleteServiceConfirm')}</p>
        </div>
        <div className="w-full flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 border border-secondary/15 rounded-xl cursor-pointer">
            {t('cancel')}
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer shadow-md">
            {t('yesDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}
