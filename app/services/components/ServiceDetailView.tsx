'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, SlidersHorizontal, Plus, ArrowUp, ArrowDown, Trash2, Layers, Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptionModal, DeleteOptionModal } from './OptionModal';
import { PackagesTab } from './PackagesTab';
import { AddonsTab } from './AddonsTab';
import { OptionType, OPTION_TYPE_LABELS } from '@/lib/serviceOptionsStore';
import { assignServiceOptions, type ApiServiceDetail } from '@/lib/api';
import { toast } from 'sonner';

interface ServiceDetailViewProps {
  selectedServiceId: number;
  onBack: () => void;
  serviceDetail: ApiServiceDetail | null;
  detailLoading: boolean;
  refresh: () => void;
  language: string;
  dir: string;
  t: (k: string) => string;
  token: string;
}

const TYPE_ICONS: Record<OptionType, React.FC<{ className?: string }>> = {
  text: SlidersHorizontal, // Fallback placeholder
  number: SlidersHorizontal,
  select: SlidersHorizontal,
  color: SlidersHorizontal,
  employee: SlidersHorizontal,
};

const TYPE_COLORS: Record<OptionType, string> = {
  text: 'bg-blue-100 text-blue-700',
  number: 'bg-purple-100 text-purple-700',
  select: 'bg-amber-100 text-amber-700',
  color: 'bg-pink-100 text-pink-700',
  employee: 'bg-emerald-100 text-emerald-700',
};

export function ServiceDetailView({
  selectedServiceId,
  onBack,
  serviceDetail,
  detailLoading,
  refresh,
  language,
  dir,
  t,
  token,
}: ServiceDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'options' | 'packages' | 'addons'>('options');
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const BackIcon = dir === 'ltr' ? ChevronLeft : ChevronRight;

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
    const valuesList: any[] = [];
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

  const handleDeleteOption = async () => {
    if (!deleteTarget) return;
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
            onConfirm={handleDeleteOption}
            t={t}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white/50 hover:bg-white/80 shadow-sm transition-colors text-secondary cursor-pointer"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {serviceDetail?.name}
            </h2>
            <p className="text-sm text-secondary/50 mt-0.5">
              {serviceDetail?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Detail view Tabs */}
      <div className="flex border-b border-secondary/10 bg-secondary/5 p-1 rounded-2xl gap-1 max-w-md">
        <button
          onClick={() => setActiveTab('options')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === 'options'
              ? "bg-white text-secondary shadow-sm"
              : "text-secondary/50 hover:text-secondary"
          )}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {language === 'ar' ? 'خيارات الخدمة' : 'Service Options'}
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === 'packages'
              ? "bg-white text-secondary shadow-sm"
              : "text-secondary/50 hover:text-secondary"
          )}
        >
          <Layers className="w-4 h-4" />
          {language === 'ar' ? 'الباقات' : 'Packages'}
        </button>
        <button
          onClick={() => setActiveTab('addons')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === 'addons'
              ? "bg-white text-secondary shadow-sm"
              : "text-secondary/50 hover:text-secondary"
          )}
        >
          <Activity className="w-4 h-4" />
          {language === 'ar' ? 'الاضافات' : 'Add-ons'}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'options' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
            <span className="font-semibold text-secondary text-sm">
              {t('serviceOptions') || 'Service Options'}
            </span>
            <button
              onClick={() => setShowOptionModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> {t('addOption')}
            </button>
          </div>

          <div className="glass-panel rounded-3xl overflow-hidden min-h-[150px] relative">
            {detailLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {serviceOptions.length === 0 ? (
              !detailLoading && (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-secondary/40 text-center">
                  <SlidersHorizontal className="w-12 h-12 opacity-30" />
                  <p className="font-medium">{t('noOptionsYet')}</p>
                </div>
              )
            ) : (
              <div className="divide-y divide-secondary/8">
                {serviceOptions.map((opt: any, idx: number) => {
                  const Icon = TYPE_ICONS[opt.type as OptionType] || SlidersHorizontal;
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
                        <Icon className="w-4 h-4" />
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
        </div>
      )}

      {activeTab === 'packages' && <PackagesTab serviceId={selectedServiceId} />}

      {activeTab === 'addons' && <AddonsTab serviceId={selectedServiceId} />}
    </div>
  );
}
