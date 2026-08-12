'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit2, Loader2, X, Activity, AlertTriangle } from 'lucide-react';
import {
  getServiceAddons,
  createServiceAddon,
  updateServiceAddon,
  deleteServiceAddon,
  type ApiServiceAddon,
} from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';

interface AddonsTabProps {
  serviceId: number;
}

interface FormState {
  nameAr: string;
  nameEn: string;
  price: string;
  sortOrder: string;
}

const EMPTY_FORM: FormState = { nameAr: '', nameEn: '', price: '', sortOrder: '1' };

export function AddonsTab({ serviceId }: AddonsTabProps) {
  const { t, language } = useLanguage();
  const [addons, setAddons] = useState<ApiServiceAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; data?: ApiServiceAddon } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiServiceAddon | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const ar = language === 'ar';

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await getServiceAddons(serviceId, token);
      setAddons(res.data.items);
    } catch (err: any) {
      toast.error(err?.message || (ar ? 'فشل تحميل الإضافات' : 'Failed to load add-ons'));
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

  const openEdit = (addon: ApiServiceAddon) => {
    setForm({
      nameAr: addon.name_ar,
      nameEn: addon.name_en,
      price: addon.price,
      sortOrder: String(addon.sort_order),
    });
    setModal({ mode: 'edit', data: addon });
  };

  const closeModal = () => setModal(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken();
    if (!token) return;

    const payload = {
      name_ar: form.nameAr,
      name_en: form.nameEn,
      price: parseFloat(form.price) || 0,
      sort_order: parseInt(form.sortOrder) || 1,
    };

    setSaving(true);
    try {
      if (modal?.mode === 'add') {
        await createServiceAddon(serviceId, payload, token);
        toast.success(ar ? 'تم إضافة الإضافة بنجاح' : 'Add-on added successfully');
      } else if (modal?.mode === 'edit' && modal.data) {
        await updateServiceAddon(serviceId, modal.data.id, payload, token);
        toast.success(ar ? 'تم تحديث الإضافة بنجاح' : 'Add-on updated successfully');
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
      await deleteServiceAddon(serviceId, deleteTarget.id, token);
      toast.success(ar ? 'تم حذف الإضافة بنجاح' : 'Add-on deleted successfully');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      // Backend may return a 422 if the addon is linked to service orders — show the server message
      toast.error(err?.message || (ar ? 'فشل حذف الإضافة' : 'Failed to delete add-on'));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const field = (key: keyof FormState) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary text-sm">
          {ar ? 'إضافات الخدمة' : 'Service Add-ons'}{' '}
          <span className="text-secondary/40 font-normal text-xs">({addons.length})</span>
        </span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> {ar ? 'إضافة' : 'Add Add-on'}
        </button>
      </div>

      {/* List */}
      <div className="glass-panel rounded-3xl overflow-hidden min-h-[150px] relative divide-y divide-secondary/8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-secondary/40">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs font-medium">{ar ? 'جارٍ التحميل...' : 'Loading...'}</p>
          </div>
        ) : addons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-secondary/40 text-center">
            <Activity className="w-10 h-10 opacity-30" />
            <p className="text-xs font-medium">{ar ? 'لا توجد إضافات مضافة لهذه الخدمة' : 'No add-ons added for this service yet'}</p>
          </div>
        ) : (
          addons.map((addon) => {
            const name = ar ? addon.name_ar : addon.name_en;
            return (
              <div key={addon.id} className="flex items-center justify-between p-5 hover:bg-white/40 transition-colors group">
                <div className="flex-1 min-w-0 pr-4 rtl:pr-0 rtl:pl-4 text-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-secondary">{name}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold px-2 py-0.5 rounded-full">
                      +{parseFloat(addon.price).toLocaleString(undefined, { minimumFractionDigits: 3 })} {ar ? 'د.ك' : 'KD'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(addon)}
                    className="p-1.5 bg-white text-yellow-500 hover:bg-yellow-50 hover:text-yellow-600 rounded-lg transition-colors border border-secondary/5 cursor-pointer shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(addon)}
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
                  ? (ar ? 'إضافة إضافة جديدة' : 'Add New Add-on')
                  : (ar ? 'تعديل الإضافة' : 'Edit Add-on')}
              </h3>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-secondary/10 rounded-xl transition-colors cursor-pointer">
                <X className="w-5 h-5 text-secondary/60" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'اسم الإضافة (العربية) *' : 'Add-on Name (Arabic) *'}</label>
                <input type="text" required placeholder="ساعة تصوير إضافية" {...field('nameAr')} dir="rtl" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary font-arabic placeholder:text-secondary/40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'اسم الإضافة (الإنجليزية) *' : 'Add-on Name (English) *'}</label>
                <input type="text" required placeholder="Extra hour of coverage" {...field('nameEn')} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary placeholder:text-secondary/40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'التكلفة الإضافية (د.ك) *' : 'Additional Cost (KD) *'}</label>
                <input type="number" required step="0.001" min="0" placeholder="25.000" {...field('price')} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary placeholder:text-secondary/40" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary/50 uppercase tracking-wider">{ar ? 'الترتيب' : 'Sort Order'}</label>
                <input type="number" min="0" placeholder="1" {...field('sortOrder')} dir="ltr" className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-secondary/15 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm text-secondary placeholder:text-secondary/40" />
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
              <h3 className="font-semibold text-secondary text-lg mb-1">{ar ? 'حذف الإضافة' : 'Delete Add-on'}</h3>
              <p className="text-sm text-secondary/60">
                {ar
                  ? 'هل أنت متأكد من حذف هذه الإضافة؟ قد يتعذر الحذف إذا كانت مرتبطة بطلبات خدمة.'
                  : 'Are you sure? Deletion may fail if this add-on is linked to service orders.'}
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
