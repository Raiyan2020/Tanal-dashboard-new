'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Loader2, RefreshCw, Plus, ArrowUp, ArrowDown, Pencil, Trash2, X, Save
} from 'lucide-react';
import {
  getLandingEventTypes, createEventType, updateEventType, deleteEventType, reorderEventTypes,
  type LandingEventType
} from '@/lib/api';
import { BilingualField, SectionSkeleton, DeleteConfirm } from './shared';

interface ETForm {
  name_ar: string;
  name_en: string;
}

const emptyETForm = (): ETForm => ({
  name_ar: '',
  name_en: '',
});

export default function EventTypesSection({ token }: { token: string }) {
  const { t, language } = useLanguage();
  const [types, setTypes] = useState<LandingEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; et: LandingEventType } | { mode: 'delete'; et: LandingEventType }>(null);
  const [form, setForm] = useState<ETForm>(emptyETForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLandingEventTypes(token)
      .then(r => setTypes(r.data?.items ?? []))
      .catch(() => toast.error(t('lpFailedToLoadEventTypes')))
      .finally(() => setLoading(false));
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const moveType = (idx: number, dir: 'up' | 'down') => {
    const arr = [...types];
    if (dir === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (dir === 'down' && idx < arr.length - 1) {
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    }
    setTypes(arr);
  };

  const saveReorder = async () => {
    setSaving(true);
    try {
      await reorderEventTypes(types.map((t, i) => ({ id: t.id, sort: i })), token);
      toast.success(t('lpSavedOrder'));
    } catch (e) {
      toast.error((e as Error).message);
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
    });

    const result = schema.safeParse({
      nameAr: form.name_ar,
      nameEn: form.name_en,
    });

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setFormSaving(true);
    try {
      if (modal?.mode === 'add') {
        await createEventType(form, token);
      } else if (modal?.mode === 'edit') {
        await updateEventType(modal.et.id, form, token);
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
      await deleteEventType(modal.et.id, token);
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
          {t('lpEventTypes')} <span className="text-secondary/40 font-normal text-sm">({types.length})</span>
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
              setForm(emptyETForm());
              setModal({ mode: 'add' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('lpAddType')}
          </button>
        </div>
      </div>
      {loading ? (
        <SectionSkeleton />
      ) : (
        <div className="space-y-3">
          {types.map((et, idx) => (
            <motion.div
              key={et.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-3 p-4 bg-white/40 border border-secondary/10 rounded-2xl group hover:bg-white/60 transition-colors shadow-sm"
            >
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveType(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveType(idx, 'down')}
                  disabled={idx === types.length - 1}
                  className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {idx + 1}
              </span>
              <p className="flex-1 font-semibold text-secondary text-sm">
                {language === 'ar' ? et.name_ar : et.name_en}
              </p>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setForm({ name_ar: et.name_ar, name_en: et.name_en });
                    setModal({ mode: 'edit', et });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> {t('lpEdit')}
                </button>
                <button
                  onClick={() => setModal({ mode: 'delete', et })}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {t('lpDelete')}
                </button>
              </div>
            </motion.div>
          ))}
          {types.length === 0 && (
            <div className="text-center py-12 text-secondary/40 text-sm">{t('lpNoTypes')}</div>
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
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                <h3 className="font-bold text-secondary">
                  {modal?.mode === 'add' ? t('lpAddEventTypeTitle') : t('lpEditEventTypeTitle')}
                </h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer">
                  <X className="w-5 h-5 text-secondary/60" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <BilingualField
                  labelEn={`${t('lpName')} (EN)`}
                  labelAr={`${t('lpName')} (AR)`}
                  valueEn={form.name_en}
                  valueAr={form.name_ar}
                  onChangeEn={v => setForm(f => ({ ...f, name_en: v }))}
                  onChangeAr={v => setForm(f => ({ ...f, name_ar: v }))}
                  placeholderEn={t('lpEventTypeEnPlaceholder')}
                  placeholderAr={t('lpEventTypeArPlaceholder')}
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
            label={language === 'ar' ? modal.et.name_ar : modal.et.name_en}
            onConfirm={doDelete}
            onCancel={() => setModal(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
