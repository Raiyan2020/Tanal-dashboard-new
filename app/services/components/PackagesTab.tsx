'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Loader2, X, Layers, AlertTriangle } from 'lucide-react';
import {
  getServicePackages,
  createServicePackage,
  updateServicePackage,
  deleteServicePackage,
  BARCODE_INVITATIONS_KEY,
  type ApiServicePackage,
} from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';

interface PackagesTabProps {
  serviceId: number;
  /** Drives the guests_included requirement for barcode-invitation packages. */
  systemKey?: string | null;
}

interface FormState {
  nameAr: string;
  nameEn: string;
  price: string;
  descAr: string;
  descEn: string;
  sortOrder: string;
  guestsIncluded: string;
}

const EMPTY_FORM: FormState = {
  nameAr: '', nameEn: '', price: '', descAr: '', descEn: '', sortOrder: '1', guestsIncluded: '',
};

export function PackagesTab({ serviceId, systemKey }: PackagesTabProps) {
  // The barcode service allocates a guest quota per package, so the field is
  // mandatory there and hidden everywhere else.
  const requiresGuests = systemKey === BARCODE_INVITATIONS_KEY;
  const { t, language } = useLanguage();
  const [packages, setPackages] = useState<ApiServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: ApiServicePackage } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiServicePackage | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const ar = language === 'ar';

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await getServicePackages(serviceId, token);
      setPackages(res.data.items);
    } catch (err: any) {
      toast.error(err?.message || (ar ? 'فشل تحميل الباقات' : 'Failed to load packages'));
    } finally {
      setLoading(false);
    }
  }, [serviceId, ar]);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ mode: 'add' });
  };

  const openEdit = (pkg: ApiServicePackage) => {
    setForm({
      nameAr: pkg.name_ar,
      nameEn: pkg.name_en,
      price: pkg.price,
      descAr: pkg.description_ar ?? '',
      descEn: pkg.description_en ?? '',
      sortOrder: String(pkg.sort_order),
      guestsIncluded: pkg.guests_included != null ? String(pkg.guests_included) : '',
    });
    setModal({ mode: 'edit', data: pkg });
  };

  const closeModal = () => setModal(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    if (requiresGuests && !form.guestsIncluded.trim()) {
      toast.error(ar ? 'عدد المدعوين مطلوب لهذه الباقة' : 'Guests included is required for this package');
      return;
    }

    const payload = {
      name_ar: form.nameAr,
      name_en: form.nameEn,
      price: parseFloat(form.price) || 0,
      description_ar: form.descAr || undefined,
      description_en: form.descEn || undefined,
      sort_order: parseInt(form.sortOrder) || 1,
      guests_included: requiresGuests ? Number(form.guestsIncluded) : undefined,
    };

    setSaving(true);
    try {
      if (modal?.mode === 'add') {
        await createServicePackage(serviceId, payload, token);
        toast.success(ar ? 'تم إضافة الباقة بنجاح' : 'Package added successfully');
      } else if (modal?.mode === 'edit' && modal.data) {
        await updateServicePackage(serviceId, modal.data.id, payload, token);
        toast.success(ar ? 'تم تحديث الباقة بنجاح' : 'Package updated successfully');
      }
      closeModal();
      load();
    } catch (err: any) {
      toast.error(err?.message || (ar ? 'حدث خطأ أثناء الحفظ' : 'Error while saving'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const token = getToken();
    if (!token) return;

    setDeleting(true);
    try {
      await deleteServicePackage(serviceId, deleteTarget.id, token);
      toast.success(ar ? 'تم حذف الباقة بنجاح' : 'Package deleted successfully');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || (ar ? 'فشل حذف الباقة' : 'Failed to delete package'));
    } finally {
      setDeleting(false);
    }
  };

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary text-sm">
          {ar ? 'باقات الخدمة' : 'Service Packages'}{' '}
          <span className="text-secondary/40 font-normal text-xs">({packages.length})</span>
        </span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> {ar ? 'إضافة باقة' : 'Add Package'}
        </button>
      </div>

      {/* List */}
      <div className="glass-panel rounded-3xl overflow-hidden min-h-[150px] relative divide-y divide-secondary/8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-secondary/40">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs font-medium">{ar ? 'جارٍ التحميل...' : 'Loading...'}</p>
          </div>
        ) : packages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-secondary/40 text-center">
            <Layers className="w-10 h-10 opacity-30" />
            <p className="text-xs font-medium">{ar ? 'لا توجد باقات مضافة لهذه الخدمة' : 'No packages added for this service yet'}</p>
          </div>
        ) : (
          packages.map((pkg) => {
            const name = ar ? pkg.name_ar : pkg.name_en;
            const desc = ar ? pkg.description_ar : pkg.description_en;
            return (
              <div key={pkg.id} className="flex items-center justify-between p-5 hover:bg-white/40 transition-colors group">
                <div className="flex-1 min-w-0 pr-4 rtl:pr-0 rtl:pl-4 text-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-secondary">{name}</span>
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                      {parseFloat(pkg.price).toLocaleString(undefined, { minimumFractionDigits: 3 })} {ar ? 'د.ك' : 'KD'}
                    </span>
                    {pkg.guests_included != null && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">
                        {ar ? `${pkg.guests_included} مدعو` : `${pkg.guests_included} guests`}
                      </span>
                    )}
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
                {modal.mode === 'add'
                  ? (ar ? 'إضافة باقة جديدة' : 'Add New Package')
                  : (ar ? 'تعديل الباقة' : 'Edit Package')}
              </h3>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5 text-secondary/60" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'اسم الباقة (العربية) *' : 'Package Name (Arabic) *'}</label>
                <input type="text" required {...field('nameAr')} dir="rtl" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary font-arabic" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'اسم الباقة (الإنجليزية) *' : 'Package Name (English) *'}</label>
                <input type="text" required {...field('nameEn')} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'السعر (د.ك) *' : 'Price (KD) *'}</label>
                <input type="number" required step="0.001" min="0" {...field('price')} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'الوصف (العربية)' : 'Description (Arabic)'}</label>
                <textarea rows={2} {...field('descAr')} dir="rtl" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary font-arabic resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'الوصف (الإنجليزية)' : 'Description (English)'}</label>
                <textarea rows={2} {...field('descEn')} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary resize-none" />
              </div>
              {/* Barcode-invitation packages carry a guest quota */}
              {requiresGuests && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">
                    {ar ? 'عدد المدعوين المشمول *' : 'Guests Included *'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    {...field('guestsIncluded')}
                    dir="ltr"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary"
                  />
                  <p className="text-[10px] text-secondary/45">
                    {ar
                      ? 'الحد الأقصى لعدد المدعوين المسموح به لهذه الباقة.'
                      : 'Maximum number of guests allowed on this package.'}
                  </p>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'الترتيب' : 'Sort Order'}</label>
                <input type="number" min="0" {...field('sortOrder')} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary/10 bg-secondary/5 shrink-0">
              <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-secondary/70 bg-white border border-secondary/15 rounded-xl transition-colors cursor-pointer">
                {t('cancel')}
              </button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
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
              <h3 className="font-semibold text-secondary text-lg mb-1">{ar ? 'حذف الباقة' : 'Delete Package'}</h3>
              <p className="text-sm text-secondary/60">
                {ar ? 'هل أنت متأكد من حذف هذه الباقة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this package? This cannot be undone.'}
              </p>
            </div>
            <div className="w-full flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 px-4 py-2.5 text-sm font-medium text-secondary/70 bg-secondary/5 border border-secondary/15 rounded-xl cursor-pointer">
                {t('cancel')}
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer shadow-md disabled:opacity-60">
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('yesDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
