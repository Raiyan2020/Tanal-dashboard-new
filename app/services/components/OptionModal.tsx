'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { SlidersHorizontal, X, Loader2, Check, Save, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getAdminServiceOptions,
  assignServiceOptions,
  type ServiceOptionItem
} from '@/lib/api';
import { type OptionType } from '@/lib/serviceOptionsStore';
import { toast } from 'sonner';

interface OptionModalProps {
  serviceId: string;
  currentOptionIds: number[];
  onClose: () => void;
  onSave: () => void;
  language: string;
  dir: string;
  t: (k: string) => string;
  token: string;
}

export function OptionModal({
  serviceId, currentOptionIds, onClose, onSave, language, dir, t, token,
}: OptionModalProps) {
  const [globalOptions, setGlobalOptions] = useState<ServiceOptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>(currentOptionIds);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAdminServiceOptions(token, { page: 1, per_page: 100 })
      .then(res => {
        setGlobalOptions(res.data.items || []);
      })
      .catch(err => {
        toast.error((err as Error).message || 'فشل جلب خيارات الخدمة');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const toggleOption = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConfirmSave = async () => {
    if (selectedIds.length === 0) {
      toast.error(language === 'ar' ? 'يجب اختيار خيار واحد على الأقل' : 'Please select at least one option');
      return;
    }
    setSaving(true);
    try {
      await assignServiceOptions(Number(serviceId), selectedIds, token);
      toast.success(language === 'ar' ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully');
      onSave();
    } catch (err) {
      toast.error((err as Error).message || 'فشل حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-secondary text-base text-start">
              {language === 'ar' ? 'تعديل خيارات الخدمة' : 'Manage Service Options'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5 text-secondary/60" />
          </button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto flex-1 text-start">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : globalOptions.length === 0 ? (
            <p className="text-sm text-secondary/50 text-center py-10">
              {language === 'ar' ? 'لا توجد خيارات خدمة مضافة حالياً. يرجى إضافتها أولاً.' : 'No service options available yet.'}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {globalOptions.map(opt => {
                  const isChecked = selectedIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(opt.id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-start cursor-pointer",
                        isChecked
                          ? "border-primary bg-primary/5 text-secondary font-semibold"
                          : "border-secondary/10 hover:bg-secondary/5 text-secondary/70"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{opt.name}</span>
                        <span className="text-[10px] text-secondary/50 mt-1 uppercase font-semibold">
                          {opt.type} • {opt.is_required ? t('optionRequired') : (language === 'ar' ? 'اختياري' : 'Optional')}
                        </span>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                        isChecked ? "bg-primary border-primary text-white" : "border-secondary/20 bg-white"
                      )}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedIds.length === 0 && (
                <p className="text-xs text-red-500 font-semibold text-center mt-1">
                  {language === 'ar' ? 'يجب تحديد خيار خدمة واحد على الأقل.' : 'At least one service option must be selected.'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary/10 bg-secondary/5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary/70 hover:text-secondary bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={loading || saving || selectedIds.length === 0}
            onClick={handleConfirmSave}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-sm shadow-primary/20"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('saveChanges')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface DeleteOptionModalProps {
  onClose: () => void;
  onConfirm: () => void;
  t: (k: string) => string;
}

export function DeleteOptionModal({ onClose, onConfirm, t }: DeleteOptionModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden"
      >
        <div className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-secondary text-lg mb-1">{t('deleteOption')}</h3>
            <p className="text-sm text-secondary/60">{t('deleteOptionConfirm')} {t('cannotBeUndone')}</p>
          </div>
          <div className="w-full flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 hover:bg-secondary/10 border border-secondary/15 rounded-xl transition-colors cursor-pointer">
              {t('cancel')}
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-md">
              {t('yesDelete')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
