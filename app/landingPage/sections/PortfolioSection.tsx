'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Loader2, RefreshCw, Plus, LayoutGrid, Pencil, Trash2, ArrowUp, ArrowDown, X, Save
} from 'lucide-react';
import {
  getLandingPortfolio, createPortfolioItem, updatePortfolioItem, deletePortfolioItem, reorderPortfolio,
  type LandingPortfolioItem
} from '@/lib/api';
import { BilingualField, ImageUploadBox, SectionSkeleton, DeleteConfirm } from './shared';

interface PortfolioForm {
  name_ar: string;
  name_en: string;
  imageFile?: File;
  imagePreview?: string;
}

const emptyPortfolioForm = (): PortfolioForm => ({
  name_ar: '',
  name_en: '',
});

export default function PortfolioSection({ token }: { token: string }) {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<LandingPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; item: LandingPortfolioItem } | { mode: 'delete'; item: LandingPortfolioItem }>(null);
  const [form, setForm] = useState<PortfolioForm>(emptyPortfolioForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      getLandingPortfolio(token, 'ar'),
      getLandingPortfolio(token, 'en')
    ])
      .then(([resAr, resEn]) => {
        const arItems = resAr.data?.items || [];
        const enItems = resEn.data?.items || [];
        const enMap = new Map(enItems.map(item => [item.id, item]));

        const merged: LandingPortfolioItem[] = arItems.map(arItem => {
          const enItem = enMap.get(arItem.id);
          return {
            ...arItem,
            name_ar: arItem.name || '',
            name_en: enItem?.name || '',
          };
        });
        setItems(merged);
      })
      .catch(() => toast.error(t('lpErrorPortfolio')))
      .finally(() => setLoading(false));
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const moveItem = async (idx: number, dir: 'up' | 'down') => {
    const arr = [...items];
    if (dir === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (dir === 'down' && idx < arr.length - 1) {
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    }

    setItems(arr);
    setSaving(true);

    try {
      await reorderPortfolio(arr.map((it, i) => ({ id: it.id, sort: i })), token);
      toast.success(t('lpSavedOrder'));
    } catch (e) {
      toast.error((e as Error).message);
      load();
    } finally {
      setSaving(false);
    }
  };

  const submitForm = async () => {
    const schema = z.object({
      nameAr: z.string().min(1, { message: language === 'ar' ? 'الاسم بالعربية مطلوب' : 'Name in Arabic is required' })
        .max(40, { message: language === 'ar' ? 'الاسم لا يمكن أن يتجاوز 40 حرفاً' : 'Name must not exceed 40 characters' }),
      nameEn: z.string().min(1, { message: language === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'Name in English is required' })
        .max(40, { message: language === 'ar' ? 'الاسم لا يمكن أن يتجاوز 40 حرفاً' : 'Name must not exceed 40 characters' }),
      image: z.any().refine(val => val !== null && val !== undefined, { message: language === 'ar' ? 'صورة المعرض مطلوبة' : 'Portfolio image is required' }),
    });

    const result = schema.safeParse({
      nameAr: form.name_ar,
      nameEn: form.name_en,
      image: form.imageFile || (modal?.mode === 'edit' ? modal.item.image : null),
    });

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setFormSaving(true);
    try {
      if (modal?.mode === 'add') {
        await createPortfolioItem({ ...form, image: form.imageFile }, token);
      } else if (modal?.mode === 'edit') {
        await updatePortfolioItem(modal.item.id, { ...form, image: form.imageFile }, token);
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
      await deletePortfolioItem(modal.item.id, token);
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
          {t('lpPortfolio')}{' '}
          <span className="text-secondary/40 font-normal text-sm">({items.length})</span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setForm(emptyPortfolioForm());
              setModal({ mode: 'add' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('lpAddPortfolioTitle')}
          </button>
        </div>
      </div>
      {loading ? (
        <SectionSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white/40 border border-secondary/10 rounded-2xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow"
            >
              <div className="aspect-video relative bg-secondary/5">
                {item.image_url ? (
                  <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutGrid className="w-8 h-8 text-secondary/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setForm({ name_ar: item.name_ar, name_en: item.name_en });
                      setModal({ mode: 'edit', item });
                    }}
                    className="p-2 bg-white rounded-xl cursor-pointer hover:bg-secondary/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-secondary" />
                  </button>
                  <button
                    onClick={() => setModal({ mode: 'delete', item })}
                    className="p-2 bg-red-500 text-white rounded-xl cursor-pointer hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <p className="font-semibold text-secondary text-sm truncate">{item.name}</p>
                <div className="flex gap-0.5 shrink-0">
                  <button
                    onClick={() => moveItem(idx, 'up')}
                    disabled={idx === 0 || saving}
                    className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-secondary/60" />
                  </button>
                  <button
                    onClick={() => moveItem(idx, 'down')}
                    disabled={idx === items.length - 1 || saving}
                    className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5 text-secondary/60" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center py-12 text-secondary/40 text-sm">
              {t('lpNoItems')}
            </div>
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
                  {modal?.mode === 'add' ? t('lpAddPortfolioTitle') : t('lpEditPortfolioTitle')}
                </h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer">
                  <X className="w-5 h-5 text-secondary/60" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <ImageUploadBox
                  url={form.imagePreview ?? (modal?.mode === 'edit' ? modal.item.image_url : null)}
                  label={t('lpPortfolioImage')}
                  onFile={f => setForm(v => ({ ...v, imageFile: f, imagePreview: URL.createObjectURL(f) }))}
                  onClear={() => setForm(v => ({ ...v, imageFile: undefined, imagePreview: undefined }))}
                />
                <BilingualField
                  labelEn={`${t('lpName')} (EN)`}
                  labelAr={`${t('lpName')} (AR)`}
                  valueEn={form.name_en}
                  valueAr={form.name_ar}
                  onChangeEn={v => setForm(f => ({ ...f, name_en: v }))}
                  onChangeAr={v => setForm(f => ({ ...f, name_ar: v }))}
                  placeholderEn={t('lpPortfolioNameEnPlaceholder')}
                  placeholderAr={t('lpPortfolioNameArPlaceholder')}
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
            label={modal.item.name}
            onConfirm={doDelete}
            onCancel={() => setModal(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
