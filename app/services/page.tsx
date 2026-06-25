'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal, Plus, Trash2, Edit2, X, Save, ChevronRight, ChevronLeft,
  AlertTriangle, ArrowUp, ArrowDown, Type, Hash, List, Palette, User, Check,
  GripVertical, Loader2, UploadCloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ServiceOption, ServiceOptionSelectValue, OptionType,
  getOptions, getSelectValues,
  saveOption, deleteOption, generateOptionId,
  saveSelectValuesForOption, generateSelectValueId,
  OPTION_TYPE_LABELS,
} from '@/lib/serviceOptionsStore';
import {
  getServices, getServiceById, createService, updateService, deleteService,
  type ApiService, type ApiServiceOption, type ApiServiceDetail, type CreateServicePayload
} from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

// ── Type Icon map ─────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<OptionType, React.FC<{ className?: string }>> = {
  text: Type,
  number: Hash,
  select: List,
  color: Palette,
  employee: User,
};

const TYPE_COLORS: Record<OptionType, string> = {
  text: 'bg-blue-100 text-blue-700',
  number: 'bg-purple-100 text-purple-700',
  select: 'bg-amber-100 text-amber-700',
  color: 'bg-pink-100 text-pink-700',
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

interface ServiceFormData {
  id?: number;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  sort_order: number;
  image?: File | null;
  image_url?: string | null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ServiceOptionsPage() {
  const { dir, t, language } = useLanguage();
  const token = getToken() ?? '';

  const [services, setServices] = useState<ApiService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [serviceDetail, setServiceDetail] = useState<ApiServiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [serviceModal, setServiceModal] = useState<{ mode: 'add' | 'edit'; data?: ServiceFormData } | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ApiService | null>(null);

  // local option management states
  const [optionModal, setOptionModal] = useState<{ mode: 'add' | 'edit'; data?: OptionFormData } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceOption | null>(null);

  const fetchServices = useCallback(async () => {
    if (!token) return;
    setServicesLoading(true);
    try {
      const res = await getServices({ page, per_page: 15 }, token);
      setServices(res.data.items);
      setTotalPages(res.data.pagination.last_page);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل الخدمات');
    } finally {
      setServicesLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const fetchServiceDetail = useCallback(async () => {
    if (!token || selectedServiceId === null) return;
    setDetailLoading(true);
    try {
      const res = await getServiceById(selectedServiceId, token);
      setServiceDetail(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل تفاصيل الخدمة');
    } finally {
      setDetailLoading(false);
    }
  }, [token, selectedServiceId]);

  useEffect(() => {
    if (selectedServiceId !== null) {
      fetchServiceDetail();
    } else {
      setServiceDetail(null);
    }
  }, [selectedServiceId, fetchServiceDetail]);

  const refresh = useCallback(() => {
    if (selectedServiceId !== null) {
      fetchServiceDetail();
    }
  }, [selectedServiceId, fetchServiceDetail]);

  const selectedService = serviceDetail;

  const apiToUiOptionType = (type: string): OptionType => {
    if (type === 'list') return 'select';
    return type as OptionType;
  };

  const serviceOptions = useMemo(() => {
    return serviceDetail?.options
      ? serviceDetail.options.map((opt) => ({
          id: String(opt.id),
          serviceId: String(opt.service_id),
          nameEn: opt.name,
          nameAr: opt.name,
          type: apiToUiOptionType(opt.type),
          required: opt.is_required,
          order: opt.sort,
        }))
      : [];
  }, [serviceDetail]);

  const selectValues = useMemo(() => {
    if (!serviceDetail?.options) return [];
    const valuesList: ServiceOptionSelectValue[] = [];
    serviceDetail.options.forEach((opt) => {
      if (opt.values && opt.values.length > 0) {
        opt.values.forEach((v: any) => {
          valuesList.push({
            id: String(v.id),
            optionId: String(opt.id),
            labelEn: v.value,
            labelAr: v.value,
          });
        });
      }
    });
    return valuesList;
  }, [serviceDetail]);

  const BackIcon = dir === 'ltr' ? ChevronLeft : ChevronRight;

  const handleSaveOption = (form: OptionFormData) => {
    const opt: ServiceOption = {
      id: form.id,
      serviceId: String(selectedServiceId!),
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim(),
      type: form.type,
      required: form.required,
      order: form.order,
    };
    saveOption(opt);
    if (form.type === 'select' || form.type === 'color') {
      const vals: ServiceOptionSelectValue[] = form.selectValues.map((sv: any) => ({
        id: sv.id,
        optionId: form.id,
        labelEn: sv.labelEn,
        labelAr: sv.labelAr,
      }));
      saveSelectValuesForOption(form.id, vals);
    } else {
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
    const svs = selectValues.filter((v: any) => v.optionId === opt.id);
    setOptionModal({
      mode: 'edit',
      data: {
        id: opt.id,
        nameEn: opt.nameEn,
        nameAr: opt.nameAr,
        type: opt.type,
        required: opt.required,
        order: opt.order,
        selectValues: svs.map((v: any) => ({ id: v.id, labelEn: v.labelEn, labelAr: v.labelAr })),
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
    sorted.forEach((o, i) => saveOption({ ...o, order: i + 1 }));
    refresh();
  };

  const handleSaveService = async (payload: CreateServicePayload) => {
    if (!token) return;
    const saveToast = toast.loading(serviceModal?.mode === 'add' ? 'Creating service...' : 'Saving changes...');
    try {
      if (serviceModal?.mode === 'add') {
        await createService(payload, token);
        toast.success('تم إنشاء الخدمة بنجاح');
      } else if (serviceModal?.mode === 'edit' && serviceModal.data?.id) {
        await updateService(serviceModal.data.id, payload, token);
        toast.success('تم تحديث الخدمة بنجاح');
      }
      setServiceModal(null);
      fetchServices();
    } catch (err) {
      toast.error((err as Error).message || 'فشل حفظ الخدمة');
    } finally {
      toast.dismiss(saveToast);
    }
  };

  const handleDeleteService = async () => {
    if (!token || !serviceToDelete) return;
    const delToast = toast.loading('Deleting service...');
    try {
      await deleteService(serviceToDelete.id, token);
      toast.success('تم حذف الخدمة بنجاح');
      setServiceToDelete(null);
      fetchServices();
    } catch (err) {
      toast.error((err as Error).message || 'فشل حذف الخدمة');
    } finally {
      toast.dismiss(delToast);
    }
  };

  // ── SERVICE LIST VIEW ──────────────────────────────────────────────────────
  if (!selectedServiceId) {
    return (
      <div className="space-y-6 pb-10 text-start">
        <AnimatePresence>
          {serviceModal && (
            <ServiceModal
              mode={serviceModal.mode}
              initial={serviceModal.data}
              onClose={() => setServiceModal(null)}
              onSave={handleSaveService}
              language={language}
            />
          )}
          {serviceToDelete && (
            <DeleteServiceModal
              onClose={() => setServiceToDelete(null)}
              onConfirm={handleDeleteService}
              language={language}
            />
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {t('services')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {services.length}
            </span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <p className="text-sm text-secondary/50">
              {language === 'ar'
                ? 'إدارة خدمات ومميزات الحفل'
                : 'Manage event services and options'}
            </p>
            <button
              onClick={() => setServiceModal({ mode: 'add', data: { name_ar: '', name_en: '', description_ar: '', description_en: '', sort_order: 0 } })}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'إضافة خدمة' : 'Add Service'}
            </button>
          </div>
        </div>

        {/* Service Cards */}
        {servicesLoading ? (
          <div className="flex justify-center items-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {services.map((svc, index) => {
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
                      {svc.image ? (
                        <img src={svc.image} alt={svc.name} className="object-cover w-full h-full rounded-2xl" />
                      ) : (
                        svc.id === 1 ? '📸' : svc.id === 2 ? '📲' : svc.id === 3 ? '🔒' : svc.id === 4 ? '🧥' : '🎉'
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={async () => {
                          const toastId = toast.loading(language === 'ar' ? 'جاري تحميل الترجمات...' : 'Loading translations...');
                          try {
                            const [arRes, enRes] = await Promise.all([
                              getServiceById(svc.id, token, 'ar'),
                              getServiceById(svc.id, token, 'en'),
                            ]);
                            setServiceModal({
                              mode: 'edit',
                              data: {
                                id: svc.id,
                                name_ar: arRes.data.name,
                                name_en: enRes.data.name,
                                description_ar: arRes.data.description,
                                description_en: enRes.data.description,
                                sort_order: svc.sort_order,
                                image_url: svc.image,
                              },
                            });
                          } catch (err) {
                            toast.error(language === 'ar' ? 'فشل تحميل ترجمات الخدمة' : 'Failed to load service translations');
                          } finally {
                            toast.dismiss(toastId);
                          }
                        }}
                        className="p-1.5 bg-white text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors border border-secondary/5 cursor-pointer shadow-sm"
                        title={language === 'ar' ? 'تعديل الخدمة' : 'Edit Service'}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setServiceToDelete(svc)}
                        className="p-1.5 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-secondary/5 cursor-pointer shadow-sm"
                        title={language === 'ar' ? 'حذف الخدمة' : 'Delete Service'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold shadow-sm">
                        <SlidersHorizontal className="w-3 h-3" />
                        {svc.options_count}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <h3 className={cn('font-semibold text-secondary text-base mb-1', language === 'ar' ? 'font-arabic' : '')}>
                      {svc.name}
                    </h3>
                    <p className={cn('text-xs text-secondary/50 line-clamp-2', language === 'ar' ? 'font-arabic' : '')}>
                      {svc.description}
                    </p>
                  </div>

                  <div className={cn('flex items-center gap-1 text-xs font-semibold text-primary mt-auto relative', dir === 'rtl' ? 'flex-row-reverse' : '')}>
                    {language === 'ar' ? 'إدارة الخيارات' : 'Manage Options'}
                    {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!servicesLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 mt-4 border-t border-secondary/5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-secondary/60 font-mono px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        )}
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
            serviceId={String(selectedServiceId)}
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
              {selectedService?.name}
            </h2>
            <p className="text-sm text-secondary/50 mt-0.5">
              {selectedService?.description}
            </p>
          </div>
        </div>
        {detailLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <button
            onClick={() => setOptionModal({ mode: 'add' })}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('addOption')}
          </button>
        )}
      </div>

      {/* Options List */}
      <div className="glass-panel rounded-3xl overflow-hidden min-h-[150px] relative">
        {detailLoading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {serviceOptions.length === 0 ? (
          !detailLoading && (
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
          )
        ) : (
          <div className="divide-y divide-secondary/8">
            {serviceOptions.map((opt: any, idx: number) => {
              const Icon = TYPE_ICONS[opt.type as OptionType];
              const meta = OPTION_TYPE_LABELS[opt.type as OptionType];
              const optSVs = selectValues.filter((v: any) => v.optionId === opt.id);
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
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', TYPE_COLORS[opt.type as OptionType])}>
                    {Icon && <Icon className="w-4 h-4" />}
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
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-md', TYPE_COLORS[opt.type as OptionType])}>
                        {meta ? (language === 'ar' ? meta.ar : meta.en) : opt.type}
                      </span>
                      {optSVs.length > 0 && (
                        <span className="text-[10px] text-secondary/50">
                          {optSVs.length} {language === 'ar' ? 'قيمة' : 'values'}:&nbsp;
                          {optSVs.slice(0, 3).map((v: any) => language === 'ar' ? v.labelAr : v.labelEn).join(', ')}
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
              const cnt = serviceOptions.filter((o: any) => o.type === type).length;
              if (cnt === 0) return null;
              const Icon = TYPE_ICONS[type];
              const meta = OPTION_TYPE_LABELS[type];
              return (
                <span key={type} className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold', TYPE_COLORS[type])}>
                  {Icon && <Icon className="w-3 h-3" />}
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

function ServiceModal({
  mode, initial, onClose, onSave, language
}: {
  mode: 'add' | 'edit';
  initial?: ServiceFormData;
  onClose: () => void;
  onSave: (payload: CreateServicePayload) => void;
  language: string;
}) {
  const [nameAr, setNameAr] = useState(initial?.name_ar || '');
  const [nameEn, setNameEn] = useState(initial?.name_en || '');
  const [descriptionAr, setDescriptionAr] = useState(initial?.description_ar || '');
  const [descriptionEn, setDescriptionEn] = useState(initial?.description_en || '');
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url || null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const isFormValid = nameAr.trim() && nameEn.trim() && descriptionAr.trim() && descriptionEn.trim();

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
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10 shrink-0">
          <h3 className="font-semibold text-secondary text-base">
            {mode === 'add' ? (language === 'ar' ? 'إضافة خدمة جديدة' : 'Add New Service') : (language === 'ar' ? 'تعديل الخدمة' : 'Edit Service')}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5 text-secondary/60" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-start">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1 uppercase tracking-wider">Arabic Name *</label>
              <input
                type="text" dir="rtl" value={nameAr}
                onChange={e => setNameAr(e.target.value)}
                placeholder="اسم الخدمة بالعربية"
                className="w-full px-3 py-2 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-right font-arabic"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1 uppercase tracking-wider">English Name *</label>
              <input
                type="text" dir="ltr" value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                placeholder="Service name in English"
                className="w-full px-3 py-2 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1 uppercase tracking-wider">Arabic Description *</label>
              <textarea
                dir="rtl" value={descriptionAr} rows={2}
                onChange={e => setDescriptionAr(e.target.value)}
                placeholder="وصف الخدمة بالعربية"
                className="w-full px-3 py-2 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none text-right font-arabic"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1 uppercase tracking-wider">English Description *</label>
              <textarea
                dir="ltr" value={descriptionEn} rows={2}
                onChange={e => setDescriptionEn(e.target.value)}
                placeholder="Service description in English"
                className="w-full px-3 py-2 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-secondary/60 mb-1 uppercase tracking-wider">Sort Order</label>
              <input
                type="number" value={sortOrder}
                onChange={e => setSortOrder(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl bg-secondary/5 border border-secondary/15 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-secondary/60 mb-1.5 uppercase tracking-wider">Service Image</label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <div className="w-16 h-16 rounded-xl border border-secondary/15 overflow-hidden bg-secondary/5 shrink-0 flex items-center justify-center animate-fade-in">
                  <img src={imagePreview} alt="Preview" className="object-cover w-full h-full rounded-xl" />
                </div>
              )}
              <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-secondary/15 rounded-xl p-4 hover:bg-secondary/5 hover:border-primary transition-all cursor-pointer">
                <UploadCloud className="w-5 h-5 text-secondary/40 mb-1" />
                <span className="text-xs text-secondary/60 font-medium">Click to upload image</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary/10 bg-secondary/5 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary/70 hover:text-secondary bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
            Cancel
          </button>
          <button
            disabled={!isFormValid}
            onClick={() => onSave({ name_ar: nameAr, name_en: nameEn, description_ar: descriptionAr, description_en: descriptionEn, sort_order: sortOrder, image: imageFile })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition-colors cursor-pointer shadow-sm shadow-primary/20"
          >
            <Save className="w-4 h-4" />
            Save Service
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DeleteServiceModal({ onClose, onConfirm, language }: { onClose: () => void; onConfirm: () => void; language: string }) {
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
            <h3 className="font-semibold text-secondary text-lg mb-1">{language === 'ar' ? 'حذف الخدمة' : 'Delete Service'}</h3>
            <p className="text-sm text-secondary/60">{language === 'ar' ? 'هل أنت متأكد من رغبتك في حذف هذه الخدمة؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to delete this service? This action cannot be undone.'}</p>
          </div>
          <div className="w-full flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 hover:bg-secondary/10 border border-secondary/15 rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors cursor-pointer shadow-md">
              Delete
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
