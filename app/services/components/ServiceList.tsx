'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  SlidersHorizontal, Plus, Trash2, Edit2, ChevronRight, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServiceById, type ApiService } from '@/lib/api';
import { toast } from 'sonner';

interface ServiceListProps {
  services: ApiService[];
  servicesLoading: boolean;
  page: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  onSelectService: (id: number) => void;
  onAddService: () => void;
  onEditService: (svc: ApiService) => void;
  onDeleteService: (svc: ApiService) => void;
  language: string;
  dir: string;
  t: (k: string) => string;
  token: string;
}

export function ServiceList({
  services,
  servicesLoading,
  page,
  totalPages,
  setPage,
  onSelectService,
  onAddService,
  onEditService,
  onDeleteService,
  language,
  dir,
  t,
  token,
}: ServiceListProps) {
  return (
    <div className="space-y-6 pb-10 text-start">
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
            {t('manageServicesDesc')}
          </p>
          <button
            onClick={onAddService}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('addService')}
          </button>
        </div>
      </div>

      {/* Service Cards */}
      {servicesLoading ? (
        <div className="flex justify-center items-center py-32">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
                onClick={() => onSelectService(svc.id)}
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
                        const toastId = toast.loading(t('loadingTranslations'));
                        try {
                          const [arRes, enRes] = await Promise.all([
                            getServiceById(svc.id, token, 'ar'),
                            getServiceById(svc.id, token, 'en'),
                          ]);
                          onEditService({
                            ...svc,
                            name: arRes.data.name, // Will be parsed out into form defaults
                            description: arRes.data.description,
                            name_ar: arRes.data.name,
                            name_en: enRes.data.name,
                            description_ar: arRes.data.description,
                            description_en: enRes.data.description,
                            image_url: svc.image,
                          } as any);
                        } catch (err) {
                          toast.error(t('failedLoadServiceTranslations'));
                        } finally {
                          toast.dismiss(toastId);
                        }
                      }}
                      className="p-1.5 bg-white text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors border border-secondary/5 cursor-pointer shadow-sm"
                      title={t('editService')}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {/* System services are backend-managed and cannot be deleted */}
                    {svc.is_system ? (
                      <span
                        className="px-2.5 py-1 rounded-full bg-secondary/10 text-secondary/60 text-[10px] font-bold shadow-sm"
                        title={t('systemService')}
                      >
                        {t('systemBadge')}
                      </span>
                    ) : (
                      <button
                        onClick={() => onDeleteService(svc)}
                        className="p-1.5 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-secondary/5 cursor-pointer shadow-sm"
                        title={t('deleteService')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                  {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  {t('manageService')}
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
