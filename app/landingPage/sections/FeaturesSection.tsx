'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Loader2, RefreshCw, Plus, ArrowUp, ArrowDown, Pencil, Trash2, X, Save
} from 'lucide-react';
import {
  getLandingFeatures, createFeature, updateFeature, deleteFeature, reorderFeatures,
  type LandingFeature
} from '@/lib/api';
import { BilingualField, ImageUploadBox, SectionSkeleton, DeleteConfirm } from './shared';

interface StepForm {
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  iconFile?: File;
  iconPreview?: string;
}

const emptyStepForm = (): StepForm => ({
  title_ar: '',
  title_en: '',
  description_ar: '',
  description_en: '',
});

export default function FeaturesSection({ token }: { token: string }) {
  const { dir, t, language } = useLanguage();
  const [features, setFeatures] = useState<LandingFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; feat: LandingFeature } | { mode: 'delete'; feat: LandingFeature }>(null);
  const [form, setForm] = useState<StepForm>(emptyStepForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getLandingFeatures(token, 'ar'),
      getLandingFeatures(token, 'en')
    ])
      .then(([resAr, resEn]) => {
        const arItems = resAr.data?.items || [];
        const enItems = resEn.data?.items || [];
        const enMap = new Map(enItems.map(item => [item.id, item]));

        const merged: LandingFeature[] = arItems.map(arItem => {
          const enItem = enMap.get(arItem.id);
          const iconName = arItem.icon || '';
          return {
            ...arItem,
            icon_url: iconName ? (iconName.startsWith('http') ? iconName : `https://portal.tanalevents.com/storage/images/landing/features/${iconName}`) : '',
            title_ar: arItem.title || '',
            title_en: enItem?.title || '',
            description_ar: arItem.description || '',
            description_en: enItem?.description || '',
          };
        });
        setFeatures(merged);
      })
      .catch(() => toast.error(t('noDataFound')))
      .finally(() => setLoading(false));
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    const arr = [...features];
    if (dir === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (dir === 'down' && idx < arr.length - 1) {
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    }
    setFeatures(arr);
  };

  const saveReorder = async () => {
    setSaving(true);
    try {
      await reorderFeatures(features.map((f, i) => ({ id: f.id, sort: i })), token);
      toast.success(t('lpSavedOrder'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitForm = async () => {
    const schema = z.object({
      titleAr: z.string().min(1, { message: language === 'ar' ? 'العنوان بالعربية مطلوب' : 'Title in Arabic is required' })
        .max(40, { message: language === 'ar' ? 'العنوان لا يمكن أن يتجاوز 40 حرفاً' : 'Title must not exceed 40 characters' }),
      titleEn: z.string().min(1, { message: language === 'ar' ? 'العنوان بالإنجليزية مطلوب' : 'Title in English is required' })
        .max(40, { message: language === 'ar' ? 'العنوان لا يمكن أن يتجاوز 40 حرفاً' : 'Title must not exceed 40 characters' }),
      descriptionAr: z.string().min(1, { message: language === 'ar' ? 'الوصف بالعربية مطلوب' : 'Description in Arabic is required' })
        .max(100, { message: language === 'ar' ? 'الوصف لا يمكن أن يتجاوز 100 حرف' : 'Description must not exceed 100 characters' }),
      descriptionEn: z.string().min(1, { message: language === 'ar' ? 'الوصف بالإنجليزية مطلوب' : 'Description in English is required' })
        .max(100, { message: language === 'ar' ? 'الوصف لا يمكن أن يتجاوز 100 حرف' : 'Description must not exceed 100 characters' }),
      icon: z.any().refine(val => val !== null && val !== undefined, { message: language === 'ar' ? 'أيقونة الميزة مطلوبة' : 'Feature icon is required' }),
    });

    const result = schema.safeParse({
      titleAr: form.title_ar,
      titleEn: form.title_en,
      descriptionAr: form.description_ar,
      descriptionEn: form.description_en,
      icon: form.iconFile || (modal?.mode === 'edit' ? modal.feat.icon_url : null),
    });

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setFormSaving(true);
    try {
      if (modal?.mode === 'add') {
        await createFeature({ ...form, icon: form.iconFile }, token);
      } else if (modal?.mode === 'edit') {
        await updateFeature(modal.feat.id, { ...form, icon: form.iconFile }, token);
      }
      toast.success(t('lpSavedOk'));
      setModal(null);
      load();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes(', ')) {
        msg.split(', ').forEach(err => toast.error(err));
      } else {
        toast.error(msg);
      }
    } finally {
      setFormSaving(false);
    }
  };

  const doDelete = async () => {
    if (modal?.mode !== 'delete') return;
    setDeleting(true);
    try {
      await deleteFeature(modal.feat.id, token);
      toast.success(t('lpDeleted'));
      setModal(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary">
          {t('lpFeatures')}{' '}
          <span className="text-secondary/40 font-normal text-sm">({features.length})</span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={saveReorder}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-secondary/20 rounded-xl text-sm font-medium text-secondary/70 hover:text-secondary transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{' '}
            {t('lpSaveOrder')}
          </button>
          <button
            onClick={() => {
              setForm(emptyStepForm());
              setModal({ mode: 'add' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('lpAddFeature')}
          </button>
        </div>
      </div>
      {loading ? (
        <SectionSkeleton />
      ) : (
        <div className="space-y-3">
          {features.map((feat, idx) => (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-3 p-4 bg-white/40 border border-secondary/10 rounded-2xl group hover:bg-white/60 transition-colors shadow-sm"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveItem(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveItem(idx, 'down')}
                  disabled={idx === features.length - 1}
                  className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              {feat.icon_url && (
                <div className="w-10 h-10 rounded-xl bg-secondary/5 overflow-hidden shrink-0 relative">
                  <Image
                    src={feat.icon_url}
                    alt={dir === 'rtl' ? feat.title_ar : feat.title_en}
                    fill
                    className="object-contain p-1"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-secondary text-sm">
                  {dir === 'rtl' ? feat.title_ar : feat.title_en}
                </p>
                <p className="text-xs text-secondary/50 mt-0.5 truncate">
                  {dir === 'rtl' ? feat.description_ar : feat.description_en}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setForm({
                      title_ar: feat.title_ar,
                      title_en: feat.title_en,
                      description_ar: feat.description_ar,
                      description_en: feat.description_en,
                    });
                    setModal({ mode: 'edit', feat });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> {t('lpEditFeature')}
                </button>
                <button
                  onClick={() => setModal({ mode: 'delete', feat })}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('remove')}
                </button>
              </div>
            </motion.div>
          ))}
          {features.length === 0 && (
            <div className="text-center py-12 text-secondary/40 text-sm">{t('lpNoFeatures')}</div>
          )}
        </div>
      )}
      <AnimatePresence>
        {(modal?.mode === 'add' || modal?.mode === 'edit') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                <h3 className="font-bold text-secondary">
                  {modal?.mode === 'add' ? t('lpAddFeatureTitle') : t('lpEditFeatureTitle')}
                </h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer">
                  <X className="w-5 h-5 text-secondary/60" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <ImageUploadBox
                  url={form.iconPreview ?? (modal?.mode === 'edit' ? modal.feat.icon_url : null) ?? null}
                  label={t('lpIconImage')}
                  aspect="aspect-square max-w-[120px]"
                  onFile={f => setForm(v => ({ ...v, iconFile: f, iconPreview: URL.createObjectURL(f) }))}
                  onClear={() => setForm(v => ({ ...v, iconFile: undefined, iconPreview: undefined }))}
                />
                <BilingualField
                  labelEn={`${t('lpTitle')} (EN)`}
                  labelAr={`${t('lpTitle')} (AR)`}
                  valueEn={form.title_en}
                  valueAr={form.title_ar}
                  onChangeEn={v => setForm(f => ({ ...f, title_en: v }))}
                  onChangeAr={v => setForm(f => ({ ...f, title_ar: v }))}
                  placeholderEn={t('lpFeatureTitleEnPlaceholder')}
                  placeholderAr={t('lpFeatureTitleArPlaceholder')}
                />
                <BilingualField
                  labelEn={`${t('lpDescription')} (EN)`}
                  labelAr={`${t('lpDescription')} (AR)`}
                  valueEn={form.description_en}
                  valueAr={form.description_ar}
                  onChangeEn={v => setForm(f => ({ ...f, description_en: v }))}
                  onChangeAr={v => setForm(f => ({ ...f, description_ar: v }))}
                  multiline
                  placeholderEn={t('lpFeatureDescEnPlaceholder')}
                  placeholderAr={t('lpFeatureDescArPlaceholder')}
                />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-secondary/10">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary/8 text-secondary font-semibold text-sm cursor-pointer hover:bg-secondary/15 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={submitForm}
                  disabled={formSaving}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{' '}
                  {t('save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modal?.mode === 'delete' && (
          <DeleteConfirm
            label={dir === 'rtl' ? modal.feat.title_ar : modal.feat.title_en}
            onConfirm={doDelete}
            onCancel={() => setModal(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
