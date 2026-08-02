'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Loader2, RefreshCw, Plus, ArrowUp, ArrowDown, Link as LinkIcon, Pencil, Trash2, X, Save
} from 'lucide-react';
import {
  getLandingSocialLinks, createSocialLink, updateSocialLink, deleteSocialLink, reorderSocialLinks,
  type LandingSocialLink
} from '@/lib/api';
import {
  BilingualField, SectionSkeleton, DeleteConfirm, getSocialIcon, SOCIAL_PLATFORMS, inputClass, labelClass
} from './shared';

interface SLForm {
  platform: string;
  url: string;
  label_ar: string;
  label_en: string;
}

const emptySLForm = (): SLForm => ({
  platform: 'instagram',
  url: '',
  label_ar: '',
  label_en: '',
});

export default function SocialLinksSection({ token }: { token: string }) {
  const { t, language } = useLanguage();
  const [links, setLinks] = useState<LandingSocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; link: LandingSocialLink } | { mode: 'delete'; link: LandingSocialLink }>(null);
  const [form, setForm] = useState<SLForm>(emptySLForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLandingSocialLinks(token)
      .then(r => setLinks(r.data?.items ?? []))
      .catch(() => toast.error(t('lpErrorSocial')))
      .finally(() => setLoading(false));
  }, [token, t]);

  useEffect(() => {
    load();
  }, [load]);

  const moveLink = (idx: number, dir: 'up' | 'down') => {
    const arr = [...links];
    if (dir === 'up' && idx > 0) {
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    } else if (dir === 'down' && idx < arr.length - 1) {
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    }
    setLinks(arr);
  };

  const saveReorder = async () => {
    setSaving(true);
    try {
      await reorderSocialLinks(links.map((l, i) => ({ id: l.id, sort: i })), token);
      toast.success(t('lpSavedOrder'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitForm = async () => {
    const schema = z.object({
      platform: z.string().min(1, { message: language === 'ar' ? 'المنصة مطلوبة' : 'Platform is required' }),
      url: z.string().url({ message: language === 'ar' ? 'رابط المنصة غير صالح' : 'Invalid URL' }),
      labelAr: z.string().min(1, { message: language === 'ar' ? 'الاسم بالعربية مطلوب' : 'Label in Arabic is required' })
        .max(40, { message: language === 'ar' ? 'الاسم لا يمكن أن يتجاوز 40 حرفاً' : 'Label must not exceed 40 characters' }),
      labelEn: z.string().min(1, { message: language === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'Label in English is required' })
        .max(40, { message: language === 'ar' ? 'الاسم لا يمكن أن يتجاوز 40 حرفاً' : 'Label must not exceed 40 characters' }),
    });

    const result = schema.safeParse({
      platform: form.platform,
      url: form.url,
      labelAr: form.label_ar,
      labelEn: form.label_en,
    });

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setFormSaving(true);
    try {
      if (modal?.mode === 'add') {
        await createSocialLink(form, token);
      } else if (modal?.mode === 'edit') {
        await updateSocialLink(modal.link.id, form, token);
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
      await deleteSocialLink(modal.link.id, token);
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
          {t('lpSocialLinks')}{' '}
          <span className="text-secondary/40 font-normal text-sm">({links.length})</span>
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
              setForm(emptySLForm());
              setModal({ mode: 'add' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> {t('lpAddLink')}
          </button>
        </div>
      </div>
      {loading ? (
        <SectionSkeleton />
      ) : (
        <div className="space-y-3">
          {links.map((link, idx) => {
            const Icon = getSocialIcon(link.platform);
            return (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-4 bg-white/40 border border-secondary/10 rounded-2xl group hover:bg-white/60 transition-colors shadow-sm"
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    onClick={() => moveLink(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveLink(idx, 'down')}
                    disabled={idx === links.length - 1}
                    className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-secondary text-sm capitalize">{link.platform}</p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary/70 truncate hover:underline flex items-center gap-1"
                  >
                    <LinkIcon className="w-3 h-3 shrink-0" />
                    {link.url}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setForm({
                        platform: link.platform,
                        url: link.url,
                        label_ar: link.label_ar ?? '',
                        label_en: link.label_en ?? '',
                      });
                      setModal({ mode: 'edit', link });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> {t('lpEditLink')}
                  </button>
                  <button
                    onClick={() => setModal({ mode: 'delete', link })}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {t('remove')}
                  </button>
                </div>
              </motion.div>
            );
          })}
          {links.length === 0 && (
            <div className="text-center py-12 text-secondary/40 text-sm">{t('lpNoLinks')}</div>
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
                  {modal?.mode === 'add' ? t('lpAddSocialTitle') : t('lpEditSocialTitle')}
                </h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer">
                  <X className="w-5 h-5 text-secondary/60" />
                </button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className={labelClass}>{t('lpPlatform')}</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className={inputClass}
                  >
                    {SOCIAL_PLATFORMS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('lpUrl')}</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    dir="ltr"
                    className={inputClass}
                    placeholder="https://"
                  />
                </div>
                <BilingualField
                  labelEn={`${t('lpLabel')} (EN)`}
                  labelAr={`${t('lpLabel')} (AR)`}
                  valueEn={form.label_en}
                  valueAr={form.label_ar}
                  onChangeEn={v => setForm(f => ({ ...f, label_en: v }))}
                  onChangeAr={v => setForm(f => ({ ...f, label_ar: v }))}
                  placeholderEn={t('lpSocialLabelEnPlaceholder')}
                  placeholderAr={t('lpSocialLabelArPlaceholder')}
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
            label={modal.link.platform}
            onConfirm={doDelete}
            onCancel={() => setModal(null)}
            loading={deleting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
