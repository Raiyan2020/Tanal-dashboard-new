'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  SlidersHorizontal, Plus, Trash2, Edit2, X, Save, ChevronRight, ChevronLeft,
  AlertTriangle, ArrowUp, ArrowDown, Type, Hash, List, Palette, User, Check,
  GripVertical, Loader2, UploadCloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { OptionType, OPTION_TYPE_LABELS, type ServiceOptionSelectValue } from '@/lib/serviceOptionsStore';
import {
  getServices, getServiceById, createService, updateService, deleteService,
  getAdminServiceOptions, assignServiceOptions,
  type ApiService, type ApiServiceOption, type ApiServiceDetail, type CreateServicePayload,
  type ServiceOptionItem, type PaginatedItems
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
function OptionModal({
  serviceId, currentOptionIds, onClose, onSave, language, dir, t, token,
}: {
  serviceId: string;
  currentOptionIds: number[];
  onClose: () => void;
  onSave: () => void;
  language: string;
  dir: string;
  t: (k: string) => string;
  token: string;
}) {
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

export default function ServicesClient({
  initialData,
  initialPagination,
}: {
  initialData: ApiService[] | null;
  initialPagination: PaginatedItems<ApiService>['pagination'] | null;
}) {
  const { dir, t, language } = useLanguage();
  const [token] = useState(() => getToken() ?? '');

  const [services, setServices] = useState<ApiService[]>(initialData ?? []);
  const [servicesLoading, setServicesLoading] = useState(!initialData);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPagination?.last_page ?? 1);

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [serviceDetail, setServiceDetail] = useState<ApiServiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [serviceModal, setServiceModal] = useState<{ mode: 'add' | 'edit'; data?: ServiceFormData } | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ApiService | null>(null);

  // local option management states
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const isInitialMount = useRef(true);

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
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchServices();
  }, [fetchServices, initialData]);

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

  const handleDelete = async () => {
    if (!deleteTarget || selectedServiceId === null) return;
    const remainingIds = serviceOptions
      .filter(o => o.id !== deleteTarget.id)
      .map(o => Number(o.id));

    const loadToast = toast.loading(language === 'ar' ? 'جاري الحذف...' : 'Removing option...');
    try {
      await assignServiceOptions(selectedServiceId, remainingIds, token);
      toast.success(language === 'ar' ? 'تم الحذف بنجاح' : 'Removed option successfully');
      refresh();
    } catch (err) {
      toast.error((err as Error).message || 'فشل حذف الخيار');
    } finally {
      toast.dismiss(loadToast);
      setDeleteTarget(null);
    }
  };

  const moveOption = async (idx: number, direction: 'up' | 'down') => {
    const sorted = [...serviceOptions];
    if (direction === 'up' && idx > 0) {
      [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
    } else if (direction === 'down' && idx < sorted.length - 1) {
      [sorted[idx + 1], sorted[idx]] = [sorted[idx], sorted[idx + 1]];
    }

    if (selectedServiceId === null) return;
    const optionIds = sorted.map(o => Number(o.id));

    const loadToast = toast.loading(language === 'ar' ? 'جاري ترتيب الخيارات...' : 'Reordering options...');
    try {
      await assignServiceOptions(selectedServiceId, optionIds, token);
      refresh();
    } catch (err) {
      toast.error((err as Error).message || 'فشل إعادة ترتيب الخيارات');
    } finally {
      toast.dismiss(loadToast);
    }
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
        {showOptionModal && (
          <OptionModal
            key="opt-modal"
            serviceId={String(selectedServiceId)}
            currentOptionIds={serviceOptions.map(o => Number(o.id))}
            onClose={() => setShowOptionModal(false)}
            onSave={() => {
              setShowOptionModal(false);
              refresh();
            }}
            language={language}
            dir={dir}
            t={t}
            token={token}
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
            onClick={() => setShowOptionModal(true)}
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
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-secondary/40 text-center">
              <SlidersHorizontal className="w-12 h-12 opacity-30" />
              <p className="font-medium">{t('noOptionsYet')}</p>
              <button
                onClick={() => setShowOptionModal(true)}
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
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveOption(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-secondary/10 rounded-md disabled:opacity-30 cursor-pointer transition-colors">
                      <ArrowUp className="w-3 h-3 text-secondary/60" />
                    </button>
                    <button onClick={() => moveOption(idx, 'down')} disabled={idx === serviceOptions.length - 1} className="p-1 hover:bg-secondary/10 rounded-md disabled:opacity-30 cursor-pointer transition-colors">
                      <ArrowDown className="w-3 h-3 text-secondary/60" />
                    </button>
                  </div>

                  <div className="w-6 h-6 rounded-lg bg-secondary/5 flex items-center justify-center text-xs font-bold text-secondary/40 shrink-0">
                    {idx + 1}
                  </div>

                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', TYPE_COLORS[opt.type as OptionType])}>
                    {Icon && <Icon className="w-4 h-4" />}
                  </div>

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

                  <div className="flex items-center gap-1.5 shrink-0">
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

      {serviceOptions.length > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex-wrap">
          <span className="text-sm font-medium text-secondary/70">
            {language === 'ar' ? `إجمالي: ${serviceOptions.length} خيارات` : `Total: ${serviceOptions.length} options`}
          </span>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(OPTION_TYPE_LABELS) as OptionType[]).map(type => {
              const meta = OPTION_TYPE_LABELS[type];
              const displayLabel = meta ? (language === 'ar' ? meta.ar : meta.en) : type;
              return (
                <span key={type} className={cn('flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold', TYPE_COLORS[type])}>
                  {displayLabel}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ServiceModal ──
function ServiceModal({
  mode, initial, onClose, onSave, language
}: {
  mode: 'add' | 'edit';
  initial?: ServiceFormData;
  onClose: () => void;
  onSave: (payload: CreateServicePayload) => void;
  language: string;
}) {
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

// ── DeleteServiceModal ──
function DeleteServiceModal({ onClose, onConfirm, language }: { onClose: () => void; onConfirm: () => void; language: string }) {
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
