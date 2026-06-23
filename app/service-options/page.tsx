'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal, Plus, Trash2, Edit2, X, Save, ChevronRight, ChevronLeft,
  AlertTriangle, ArrowUp, ArrowDown, Type, Hash, List, Palette, User, Check,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ServiceOption, ServiceOptionSelectValue, OptionType,
  getOptions, getSelectValues,
  saveOption, deleteOption, generateOptionId,
  saveSelectValuesForOption, generateSelectValueId,
  OPTION_TYPE_LABELS,
} from '@/lib/serviceOptionsStore';
import { ORDER_MOCK_SERVICES } from '@/lib/orderStore';

// ── Type Icon map ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<OptionType, React.FC<{ className?: string }>> = {
  text:     Type,
  number:   Hash,
  select:   List,
  color:    Palette,
  employee: User,
};

const TYPE_COLORS: Record<OptionType, string> = {
  text:     'bg-blue-100 text-blue-700',
  number:   'bg-purple-100 text-purple-700',
  select:   'bg-amber-100 text-amber-700',
  color:    'bg-pink-100 text-pink-700',
  employee: 'bg-emerald-100 text-emerald-700',
};

// ── Option Form Modal ─────────────────────────────────────────────────────────

interface OptionFormData {
  id: string;
  nameEn: string;
  nameAr: string;
  type: OptionType;
  required: boolean;
  order: number;
  selectValues: { id: string; labelEn: string; labelAr: string }[];
}

function OptionModal({
  mode, serviceId, initial, onClose, onSave, nextOrder, language, dir, t,
}: {
  mode: 'add' | 'edit';
  serviceId: string;
  initial?: OptionFormData;
  onClose: () => void;
  onSave: (form: OptionFormData) => void;
  nextOrder: number;
  language: string;
  dir: string;
  t: (k: string) => string;
}) {
  const [form, setForm] = useState<OptionFormData>(
    initial ?? {
      id: generateOptionId(),
      nameEn: '',
      nameAr: '',
      type: 'text',
      required: false,
      order: nextOrder,
      selectValues: [],
    }
  );

  const addSV = () => setForm(f => ({
    ...f,
    selectValues: [...f.selectValues, { id: generateSelectValueId(), labelEn: '', labelAr: '' }],
  }));

  const removeSV = (idx: number) => setForm(f => ({
    ...f,
    selectValues: f.selectValues.filter((_, i) => i !== idx),
  }));

  const updateSV = (idx: number, field: 'labelEn' | 'labelAr', value: string) => {
    const sv = [...form.selectValues];
    sv[idx] = { ...sv[idx], [field]: value };
    setForm(f => ({ ...f, selectValues: sv }));
  };

  const canSave = form.nameEn.trim() || form.nameAr.trim();

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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-secondary text-base">
              {mode === 'add' ? t('addOption') : t('editOption')}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5 text-secondary/60" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1.5 uppercase tracking-wider">
                {t('optionName')} (EN) <span className="text-red-500">*</span>
              </label>
              <input
                type="text" dir="ltr" value={form.nameEn}
                onChange={e => setForm(f => ({ ...f, nameEn: e.target.value }))}
                placeholder="e.g. Cover Color"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1.5 uppercase tracking-wider">
                {t('optionName')} (AR) <span className="text-red-500">*</span>
              </label>
              <input
                type="text" dir="rtl" value={form.nameAr}
                onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
                placeholder="مثال: لون الكفر"
                className="w-full px-3 py-2.5 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none font-arabic text-right transition-all"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-2 uppercase tracking-wider">
              {t('optionType')}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(OPTION_TYPE_LABELS) as OptionType[]).map(type => {
                const meta = OPTION_TYPE_LABELS[type];
                const Icon = TYPE_ICONS[type];
                const isSelected = form.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type }))}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all cursor-pointer text-center',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-secondary/10 bg-white hover:bg-secondary/5 text-secondary/60'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold leading-tight">
                      {language === 'ar' ? meta.ar : meta.en}
                    </span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Required toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setForm(f => ({ ...f, required: !f.required }))}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0',
                form.required ? 'bg-primary' : 'bg-secondary/20'
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                form.required ? (dir === 'rtl' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0.5'
              )} />
            </div>
            <span className="text-sm font-medium text-secondary/80">{t('optionRequired')}</span>
          </label>

          {/* Select values (only for select/color types) */}
          {(form.type === 'select' || form.type === 'color') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-secondary/60 uppercase tracking-wider">
                  {t('selectValues')}
                </label>
                <button
                  type="button"
                  onClick={addSV}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('addSelectValue')}
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {form.selectValues.map((sv, idx) => (
                  <div key={sv.id} className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-secondary/30 shrink-0" />

                    {form.type === 'color' ? (
                      /* ── Color row: picker + hex display + Arabic name ── */
                      <>
                        {/* Color picker — value stored as hex in labelEn */}
                        <div className="relative shrink-0 group/picker">
                          <input
                            type="color"
                            value={sv.labelEn.startsWith('#') ? sv.labelEn : '#cccccc'}
                            onChange={e => updateSV(idx, 'labelEn', e.target.value)}
                            className="w-9 h-9 rounded-xl border-2 border-secondary/20 cursor-pointer p-0.5 bg-white hover:border-primary transition-colors shadow-sm"
                            title="Pick color"
                          />
                        </div>
                        {/* Hex readout */}
                        <span className="text-xs font-mono text-secondary/50 w-16 shrink-0 select-all">
                          {sv.labelEn.startsWith('#') ? sv.labelEn.toUpperCase() : '—'}
                        </span>
                        {/* Arabic display name */}
                        <input
                          type="text" dir="rtl" value={sv.labelAr}
                          onChange={e => updateSV(idx, 'labelAr', e.target.value)}
                          placeholder={t('optionValueAr')}
                          className="flex-1 px-2.5 py-1.5 text-sm rounded-lg bg-secondary/5 border border-secondary/15 focus:border-primary outline-none font-arabic text-right"
                        />
                      </>
                    ) : (
                      /* ── Select row: EN + AR text inputs ── */
                      <>
                        <input
                          type="text" dir="ltr" value={sv.labelEn}
                          onChange={e => updateSV(idx, 'labelEn', e.target.value)}
                          placeholder={t('optionValueEn')}
                          className="flex-1 px-2.5 py-1.5 text-sm rounded-lg bg-secondary/5 border border-secondary/15 focus:border-primary outline-none"
                        />
                        <input
                          type="text" dir="rtl" value={sv.labelAr}
                          onChange={e => updateSV(idx, 'labelAr', e.target.value)}
                          placeholder={t('optionValueAr')}
                          className="flex-1 px-2.5 py-1.5 text-sm rounded-lg bg-secondary/5 border border-secondary/15 focus:border-primary outline-none font-arabic text-right"
                        />
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => removeSV(idx)}
                      className="text-red-400 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {form.selectValues.length === 0 && (
                  <p className="text-center text-secondary/40 text-xs py-3">
                    {language === 'ar' ? 'لا توجد قيم. اضغط + لإضافة.' : 'No values yet. Click + to add.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary/10 bg-secondary/5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary/70 hover:text-secondary bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
            {t('cancel')}
          </button>
          <button
            disabled={!canSave}
            onClick={() => onSave(form)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-sm shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            {t('saveChanges')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────────────────────

function DeleteOptionModal({ onClose, onConfirm, t }: { onClose: () => void; onConfirm: () => void; t: (k: string) => string }) {
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ServiceOptionsPage() {
  const { dir, t, language } = useLanguage();
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [selectValues, setSelectValues] = useState<ServiceOptionSelectValue[]>([]);
  const [optionModal, setOptionModal] = useState<{ mode: 'add' | 'edit'; data?: OptionFormData } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceOption | null>(null);

  const refresh = useCallback(() => {
    setOptions(getOptions());
    setSelectValues(getSelectValues());
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const selectedService = ORDER_MOCK_SERVICES.find(s => s.id === selectedServiceId);
  const serviceOptions = options
    .filter(o => o.serviceId === selectedServiceId)
    .sort((a, b) => a.order - b.order);

  const BackIcon = dir === 'ltr' ? ChevronLeft : ChevronRight;

  const handleSaveOption = (form: OptionFormData) => {
    const opt: ServiceOption = {
      id: form.id,
      serviceId: selectedServiceId!,
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim(),
      type: form.type,
      required: form.required,
      order: form.order,
    };
    saveOption(opt);
    if (form.type === 'select' || form.type === 'color') {
      const vals: ServiceOptionSelectValue[] = form.selectValues.map(sv => ({
        id: sv.id,
        optionId: form.id,
        labelEn: sv.labelEn,
        labelAr: sv.labelAr,
      }));
      saveSelectValuesForOption(form.id, vals);
    } else {
      // remove any stale select values if type changed
      saveSelectValuesForOption(form.id, []);
    }
    refresh();
    setOptionModal(null);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteOption(deleteTarget.id);
    refresh();
    setDeleteTarget(null);
  };

  const openEdit = (opt: ServiceOption) => {
    const svs = selectValues.filter(v => v.optionId === opt.id);
    setOptionModal({
      mode: 'edit',
      data: {
        id: opt.id,
        nameEn: opt.nameEn,
        nameAr: opt.nameAr,
        type: opt.type,
        required: opt.required,
        order: opt.order,
        selectValues: svs.map(v => ({ id: v.id, labelEn: v.labelEn, labelAr: v.labelAr })),
      },
    });
  };

  const moveOption = (idx: number, direction: 'up' | 'down') => {
    const sorted = [...serviceOptions];
    if (direction === 'up' && idx > 0) {
      [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
    } else if (direction === 'down' && idx < sorted.length - 1) {
      [sorted[idx + 1], sorted[idx]] = [sorted[idx], sorted[idx + 1]];
    }
    // re-save with updated order values
    sorted.forEach((o, i) => saveOption({ ...o, order: i + 1 }));
    refresh();
  };

  const getOptionCountForService = (serviceId: string) =>
    options.filter(o => o.serviceId === serviceId).length;

  // ── SERVICE LIST VIEW ──────────────────────────────────────────────────────
  if (!selectedServiceId) {
    return (
      <div className="space-y-6 pb-10 text-start">
        <AnimatePresence>
          {deleteTarget && (
            <DeleteOptionModal
              key="del"
              onClose={() => setDeleteTarget(null)}
              onConfirm={handleDelete}
              t={t}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {t('serviceOptions')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {ORDER_MOCK_SERVICES.length}
            </span>
          </div>
          <p className="text-sm text-secondary/50">
            {language === 'ar'
              ? 'اختر خدمة لإدارة خياراتها'
              : 'Select a service to manage its options'}
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {ORDER_MOCK_SERVICES.map((svc, index) => {
            const count = getOptionCountForService(svc.id);
            const svcName = language === 'ar' ? svc.nameAr : svc.nameEn;
            const typeBreakdown = options
              .filter(o => o.serviceId === svc.id)
              .reduce<Partial<Record<OptionType, number>>>((acc, o) => {
                acc[o.type] = (acc[o.type] || 0) + 1;
                return acc;
              }, {});

            return (
              <motion.button
                key={svc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                onClick={() => setSelectedServiceId(svc.id)}
                className="group p-6 rounded-3xl glass-panel text-start hover:bg-white/70 transition-all shadow-sm border border-secondary/5 flex flex-col gap-4 cursor-pointer relative overflow-hidden"
              >
                {/* Decorative bg */}
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors" />

                <div className="flex items-start justify-between relative">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform text-xl">
                    {svc.id === 'ps1' ? '📸' : svc.id === 'ps2' ? '📲' : svc.id === 'ps3' ? '🔒' : svc.id === 'ps4' ? '🧥' : '🎉'}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    <SlidersHorizontal className="w-3 h-3" />
                    {count}
                  </div>
                </div>

                <div className="relative">
                  <h3 className={cn('font-semibold text-secondary text-base mb-1', language === 'ar' ? 'font-arabic' : '')}>
                    {svcName}
                  </h3>
                  <p className={cn('text-xs text-secondary/50 line-clamp-2', language === 'ar' ? 'font-arabic' : '')}>
                    {language === 'ar' ? svc.descriptionAr : svc.descriptionEn}
                  </p>
                </div>

                {/* Type badges */}
                {count > 0 && (
                  <div className="flex flex-wrap gap-1.5 relative">
                    {(Object.entries(typeBreakdown) as [OptionType, number][]).map(([type, cnt]) => {
                      const Icon = TYPE_ICONS[type];
                      return (
                        <span key={type} className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold', TYPE_COLORS[type])}>
                          <Icon className="w-2.5 h-2.5" />
                          {cnt}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className={cn('flex items-center gap-1 text-xs font-semibold text-primary mt-auto relative', dir === 'rtl' ? 'flex-row-reverse' : '')}>
                  {language === 'ar' ? 'إدارة الخيارات' : 'Manage Options'}
                  {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── SERVICE OPTIONS DETAIL VIEW ────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10 text-start">
      <AnimatePresence>
        {optionModal && (
          <OptionModal
            key="opt-modal"
            mode={optionModal.mode}
            serviceId={selectedServiceId}
            initial={optionModal.data}
            onClose={() => setOptionModal(null)}
            onSave={handleSaveOption}
            nextOrder={serviceOptions.length + 1}
            language={language}
            dir={dir}
            t={t}
          />
        )}
        {deleteTarget && (
          <DeleteOptionModal
            key="del"
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedServiceId(null)}
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 shadow-sm transition-colors text-secondary cursor-pointer"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {language === 'ar' ? selectedService?.nameAr : selectedService?.nameEn}
            </h2>
            <p className="text-sm text-secondary/50 mt-0.5">
              {language === 'ar' ? 'إدارة خيارات هذه الخدمة' : 'Manage options for this service'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOptionModal({ mode: 'add' })}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t('addOption')}
        </button>
      </div>

      {/* Options List */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        {serviceOptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-secondary/40">
            <SlidersHorizontal className="w-12 h-12 opacity-30" />
            <p className="font-medium">{t('noOptionsYet')}</p>
            <button
              onClick={() => setOptionModal({ mode: 'add' })}
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('addOption')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-secondary/8">
            {serviceOptions.map((opt, idx) => {
              const Icon = TYPE_ICONS[opt.type];
              const meta = OPTION_TYPE_LABELS[opt.type];
              const optSVs = selectValues.filter(v => v.optionId === opt.id);
              return (
                <motion.div
                  key={opt.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/40 transition-colors group"
                >
                  {/* Reorder */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveOption(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-secondary/10 rounded-md disabled:opacity-30 cursor-pointer transition-colors">
                      <ArrowUp className="w-3 h-3 text-secondary/60" />
                    </button>
                    <button onClick={() => moveOption(idx, 'down')} disabled={idx === serviceOptions.length - 1} className="p-1 hover:bg-secondary/10 rounded-md disabled:opacity-30 cursor-pointer transition-colors">
                      <ArrowDown className="w-3 h-3 text-secondary/60" />
                    </button>
                  </div>

                  {/* Order number */}
                  <div className="w-6 h-6 rounded-lg bg-secondary/5 flex items-center justify-center text-xs font-bold text-secondary/40 shrink-0">
                    {idx + 1}
                  </div>

                  {/* Type badge */}
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', TYPE_COLORS[opt.type])}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Names */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-secondary">
                        {language === 'ar' ? (opt.nameAr || opt.nameEn) : (opt.nameEn || opt.nameAr)}
                      </span>
                      {opt.required && (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-bold">
                          {t('optionRequired')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', TYPE_COLORS[opt.type])}>
                        {language === 'ar' ? meta.ar : meta.en}
                      </span>
                      {optSVs.length > 0 && (
                        <span className="text-[10px] text-secondary/50">
                          {optSVs.length} {language === 'ar' ? 'قيمة' : 'values'}:&nbsp;
                          {optSVs.slice(0, 3).map(v => language === 'ar' ? v.labelAr : v.labelEn).join(', ')}
                          {optSVs.length > 3 && '…'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(opt)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => setDeleteTarget(opt)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t('remove')}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {serviceOptions.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex-wrap">
          <span className="text-sm font-medium text-secondary/70">
            {language === 'ar' ? `إجمالي: ${serviceOptions.length} خيارات` : `Total: ${serviceOptions.length} options`}
          </span>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(OPTION_TYPE_LABELS) as OptionType[]).map(type => {
              const cnt = serviceOptions.filter(o => o.type === type).length;
              if (cnt === 0) return null;
              const Icon = TYPE_ICONS[type];
              const meta = OPTION_TYPE_LABELS[type];
              return (
                <span key={type} className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold', TYPE_COLORS[type])}>
                  <Icon className="w-3 h-3" />
                  {language === 'ar' ? meta.ar : meta.en}: {cnt}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
