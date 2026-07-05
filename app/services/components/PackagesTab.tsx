'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Loader2, Save, X, Layers, AlertTriangle } from 'lucide-react';
import { getMockPackages, saveMockPackages, type ServicePackage } from '@/lib/mockServicesStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface PackagesTabProps {
  serviceId: number;
}

export function PackagesTab({ serviceId }: PackagesTabProps) {
  const { t, language, dir } = useLanguage();
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: ServicePackage } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServicePackage | null>(null);

  // Form states
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [price, setPrice] = useState('');
  const [descAr, setDescAr] = useState('');
  const [descEn, setDescEn] = useState('');

  const load = () => {
    const all = getMockPackages();
    setPackages(all.filter(p => p.service_id === serviceId));
  };

  useEffect(() => {
    load();
  }, [serviceId]);

  const openAdd = () => {
    setNameAr('');
    setNameEn('');
    setPrice('');
    setDescAr('');
    setDescEn('');
    setModal({ mode: 'add' });
  };

  const openEdit = (pkg: ServicePackage) => {
    setNameAr(pkg.name_ar);
    setNameEn(pkg.name_en);
    setPrice(String(pkg.price));
    setDescAr(pkg.description_ar || '');
    setDescEn(pkg.description_en || '');
    setModal({ mode: 'edit', data: pkg });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr || !nameEn || !price) {
      toast.error(language === 'ar' ? 'يرجى تعبئة الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    const all = getMockPackages();
    const pkgPrice = parseFloat(price) || 0;

    if (modal?.mode === 'add') {
      const newPkg: ServicePackage = {
        id: Date.now(),
        service_id: serviceId,
        name_ar: nameAr,
        name_en: nameEn,
        price: pkgPrice,
        description_ar: descAr || undefined,
        description_en: descEn || undefined
      };
      saveMockPackages([...all, newPkg]);
      toast.success(language === 'ar' ? 'تم إضافة الباقة بنجاح' : 'Package added successfully');
    } else if (modal?.mode === 'edit' && modal.data) {
      const updated = all.map(p => {
        if (p.id === modal.data!.id) {
          return {
            ...p,
            name_ar: nameAr,
            name_en: nameEn,
            price: pkgPrice,
            description_ar: descAr || undefined,
            description_en: descEn || undefined
          };
        }
        return p;
      });
      saveMockPackages(updated);
      toast.success(language === 'ar' ? 'تم تحديث الباقة بنجاح' : 'Package updated successfully');
    }

    setModal(null);
    load();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const all = getMockPackages();
    saveMockPackages(all.filter(p => p.id !== deleteTarget.id));
    toast.success(language === 'ar' ? 'تم حذف الباقة بنجاح' : 'Package deleted successfully');
    setDeleteTarget(null);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary text-sm">
          {language === 'ar' ? 'باقات الخدمة' : 'Service Packages'}{' '}
          <span className="text-secondary/40 font-normal text-xs">({packages.length})</span>
        </span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> {language === 'ar' ? 'إضافة باقة' : 'Add Package'}
        </button>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden min-h-[150px] relative divide-y divide-secondary/8">
        {packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-secondary/40 text-center">
            <Layers className="w-10 h-10 opacity-30" />
            <p className="text-xs font-medium">{language === 'ar' ? 'لا توجد باقات مضافة لهذه الخدمة' : 'No packages added for this service yet'}</p>
          </div>
        ) : (
          packages.map((pkg, idx) => {
            const name = language === 'ar' ? pkg.name_ar : pkg.name_en;
            const desc = language === 'ar' ? pkg.description_ar : pkg.description_en;
            return (
              <div key={pkg.id} className="flex items-center justify-between p-5 hover:bg-white/40 transition-colors group">
                <div className="flex-1 min-w-0 pr-4 rtl:pr-0 rtl:pl-4 text-start">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-secondary">{name}</span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                      {pkg.price} {language === 'ar' ? 'د.ك' : 'KD'}
                    </span>
                  </div>
                  {desc && <p className="text-xs text-secondary/50 mt-1 line-clamp-1">{desc}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(pkg)}
                    className="p-1.5 bg-white text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors border border-secondary/5 cursor-pointer shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(pkg)}
                    className="p-1.5 bg-white text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-secondary/5 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-2xl border border-secondary/10 w-full max-w-md overflow-hidden flex flex-col text-start">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10 shrink-0">
              <h3 className="font-semibold text-secondary text-base">
                {modal.mode === 'add' ? (language === 'ar' ? 'إضافة باقة جديدة' : 'Add New Package') : (language === 'ar' ? 'تعديل الباقة' : 'Edit Package')}
              </h3>
              <button type="button" onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5 text-secondary/60" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{language === 'ar' ? 'اسم الباقة (العربية) *' : 'Package Name (Arabic) *'}</label>
                <input type="text" required value={nameAr} onChange={e => setNameAr(e.target.value)} dir="rtl" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary font-arabic" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{language === 'ar' ? 'اسم الباقة (الإنجليزية) *' : 'Package Name (English) *'}</label>
                <input type="text" required value={nameEn} onChange={e => setNameEn(e.target.value)} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{language === 'ar' ? 'السعر (د.ك) *' : 'Price (KD) *'}</label>
                <input type="number" required step="0.001" min="0" value={price} onChange={e => setPrice(e.target.value)} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{language === 'ar' ? 'الوصف (العربية)' : 'Description (Arabic)'}</label>
                <textarea rows={2} value={descAr} onChange={e => setDescAr(e.target.value)} dir="rtl" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary font-arabic resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{language === 'ar' ? 'الوصف (الإنجليزية)' : 'Description (English)'}</label>
                <textarea rows={2} value={descEn} onChange={e => setDescEn(e.target.value)} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary resize-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary/10 bg-secondary/5 shrink-0">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm font-medium text-secondary/70 bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
                {t('cancel')}
              </button>
              <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors cursor-pointer shadow-md">
                {t('save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden text-center p-6 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-semibold text-secondary text-lg mb-1">{language === 'ar' ? 'حذف الباقة' : 'Delete Package'}</h3>
              <p className="text-sm text-secondary/60">{language === 'ar' ? 'هل أنت متأكد من حذف هذه الباقة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this package? This cannot be undone.'}</p>
            </div>
            <div className="w-full flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 border border-secondary/15 rounded-xl cursor-pointer">
                {t('cancel')}
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer shadow-md">
                {t('yesDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
