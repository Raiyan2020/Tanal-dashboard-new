'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ImageIcon, Sparkles, LayoutGrid, Phone, ArrowLeft, ArrowRight,
  Save, Upload, Trash2, Plus, ArrowUp, ArrowDown, Instagram, Twitter,
  Facebook, Linkedin, Youtube, Globe, Pencil, X, Loader2, Link,
  Footprints, CalendarDays, CheckCircle2, AlertTriangle, RefreshCw,
} from 'lucide-react';
import {
  getLandingHero, updateLandingHero,
  getLandingHowItWorks, createHowItWorksStep, updateHowItWorksStep, deleteHowItWorksStep, reorderHowItWorks,
  getLandingFeatures, createFeature, updateFeature, deleteFeature, reorderFeatures,
  getLandingPortfolio, createPortfolioItem, updatePortfolioItem, deletePortfolioItem, reorderPortfolio,
  getLandingSocialLinks, createSocialLink, updateSocialLink, deleteSocialLink, reorderSocialLinks,
  getLandingFooter, updateLandingFooter,
  getLandingContact, updateLandingContact,
  getLandingEventTypes, createEventType, updateEventType, deleteEventType, reorderEventTypes,
  type LandingHero, type LandingHowItWorksStep, type LandingFeature,
  type LandingPortfolioItem, type LandingSocialLink, type LandingFooter,
  type LandingContact, type LandingEventType,
} from '@/lib/api';
import { getToken } from '@/lib/auth';

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOCIAL_PLATFORMS = [
  { id: 'instagram', name: 'Instagram', icon: Instagram },
  { id: 'twitter', name: 'X / Twitter', icon: Twitter },
  { id: 'facebook', name: 'Facebook', icon: Facebook },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin },
  { id: 'youtube', name: 'YouTube', icon: Youtube },
  { id: 'whatsapp', name: 'WhatsApp', icon: Phone },
  { id: 'custom', name: 'Website / Other', icon: Globe },
];

const getSocialIcon = (platform: string) => {
  const found = SOCIAL_PLATFORMS.find(p => p.id === platform?.toLowerCase());
  return found ? found.icon : Globe;
};

// ── Shared UI primitives ──────────────────────────────────────────────────────

const inputClass = 'w-full px-4 py-2.5 rounded-xl bg-white/50 border border-secondary/20 focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none transition-all text-sm';
const labelClass = 'block text-xs font-bold text-secondary/50 mb-1.5 uppercase tracking-wider';
const BilingualField = ({ labelEn, labelAr, valueEn, valueAr, onChangeEn, onChangeAr, multiline, rows = 3 }:
  { labelEn: string; labelAr: string; valueEn: string; valueAr: string; onChangeEn: (v: string) => void; onChangeAr: (v: string) => void; multiline?: boolean; rows?: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label className={labelClass}>{labelEn}</label>
      {multiline
        ? <textarea value={valueEn} onChange={e => onChangeEn(e.target.value)} dir="ltr" rows={rows} className={cn(inputClass, 'resize-none text-left')} />
        : <input type="text" value={valueEn} onChange={e => onChangeEn(e.target.value)} dir="ltr" className={cn(inputClass, 'text-left')} />}
    </div>
    <div>
      <label className={labelClass}>{labelAr}</label>
      {multiline
        ? <textarea value={valueAr} onChange={e => onChangeAr(e.target.value)} dir="rtl" rows={rows} className={cn(inputClass, 'resize-none text-right font-arabic')} />
        : <input type="text" value={valueAr} onChange={e => onChangeAr(e.target.value)} dir="rtl" className={cn(inputClass, 'text-right font-arabic')} />}
    </div>
  </div>
);

const ImageUploadBox = ({ url, onFile, onClear, aspect = 'aspect-video', label }: {
  url: string | null; onFile: (f: File) => void; onClear: () => void; aspect?: string; label?: string;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      {label && <label className={labelClass}>{label}</label>}
      {url ? (
        <div className={cn('relative rounded-2xl overflow-hidden bg-secondary/5 group', aspect)}>
          <Image src={url} alt="upload" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button type="button" onClick={() => ref.current?.click()} className="px-3 py-1.5 bg-white text-sm font-medium rounded-xl shadow cursor-pointer hover:bg-secondary/10 transition-colors">
              {label?.includes('صور') || label?.includes('إ') ? 'تغيير' : 'Replace'}
            </button>
            <button type="button" onClick={onClear} className="p-2 bg-red-500 text-white rounded-xl cursor-pointer hover:bg-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()}
          className={cn('rounded-2xl border-2 border-dashed border-secondary/20 flex flex-col items-center justify-center bg-white/30 text-secondary/50 hover:bg-primary/5 hover:border-primary/30 transition-colors cursor-pointer group', aspect)}>
          <Upload className="w-6 h-6 mb-2 group-hover:text-primary transition-colors" />
          <span className="text-sm font-medium group-hover:text-primary transition-colors">Upload Image</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
};

const SectionSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary/8 rounded-2xl" />)}
  </div>
);

const DeleteConfirm = ({ label, onConfirm, onCancel, loading }: { label: string; onConfirm: () => void; onCancel: () => void; loading?: boolean }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
    onClick={onCancel}>
    <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onClick={e => e.stopPropagation()}
      className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm space-y-4">
      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <div className="text-center">
        <h3 className="font-bold text-secondary text-lg">تأكيد الحذف</h3>
        <p className="text-sm text-secondary/60 mt-1">هل أنت متأكد من حذف <span className="font-semibold text-secondary">{label}</span>؟</p>
      </div>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-secondary/8 hover:bg-secondary/15 text-secondary text-sm font-semibold transition-colors cursor-pointer">إلغاء</button>
        <button onClick={onConfirm} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          حذف
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Hero
// ═════════════════════════════════════════════════════════════════════════════
function HeroSection({ token }: { token: string }) {
  const [hero, setHero] = useState<LandingHero | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLandingHero(token).then(r => { setHero(r.data?.data ?? null); }).catch(() => toast.error('فشل جلب بيانات Hero')).finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!hero) return;
    setSaving(true);
    try {
      await updateLandingHero({ title_ar: hero.title.ar, title_en: hero.title.en, subtitle_ar: hero.subtitle.ar, subtitle_en: hero.subtitle.en, primary_cta_label_ar: hero.primary_cta_label.ar, primary_cta_label_en: hero.primary_cta_label.en, primary_cta_url: hero.primary_cta_url, secondary_cta_label_ar: hero.secondary_cta_label.ar, secondary_cta_label_en: hero.secondary_cta_label.en, secondary_cta_url: hero.secondary_cta_url, image: imageFile }, token);
      toast.success('تم تحديث Hero بنجاح');
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  if (loading) return <SectionSkeleton />;
  if (!hero) return null;

  const handleImageFile = (f: File) => {
    setImageFile(f);
    const url = URL.createObjectURL(f);
    setImagePreview(url);
  };

  return (
    <div className="space-y-6">
      <BilingualField labelEn="Title (EN)" labelAr="العنوان (AR)" valueEn={hero.title.en} valueAr={hero.title.ar}
        onChangeEn={v => setHero(h => h ? { ...h, title: { ...h.title, en: v } } : h)}
        onChangeAr={v => setHero(h => h ? { ...h, title: { ...h.title, ar: v } } : h)} />

      <BilingualField labelEn="Subtitle (EN)" labelAr="النص الفرعي (AR)" valueEn={hero.subtitle.en} valueAr={hero.subtitle.ar}
        onChangeEn={v => setHero(h => h ? { ...h, subtitle: { ...h.subtitle, en: v } } : h)}
        onChangeAr={v => setHero(h => h ? { ...h, subtitle: { ...h.subtitle, ar: v } } : h)} multiline rows={3} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <BilingualField labelEn="Primary CTA (EN)" labelAr="CTA الأساسي (AR)"
            valueEn={hero.primary_cta_label.en} valueAr={hero.primary_cta_label.ar}
            onChangeEn={v => setHero(h => h ? { ...h, primary_cta_label: { ...h.primary_cta_label, en: v } } : h)}
            onChangeAr={v => setHero(h => h ? { ...h, primary_cta_label: { ...h.primary_cta_label, ar: v } } : h)} />
          <label className={cn(labelClass, 'mt-3')}>Primary CTA URL</label>
          <input type="url" value={hero.primary_cta_url} onChange={e => setHero(h => h ? { ...h, primary_cta_url: e.target.value } : h)} dir="ltr" className={cn(inputClass, 'mt-1.5')} />
        </div>
        <div>
          <BilingualField labelEn="Secondary CTA (EN)" labelAr="CTA الثانوي (AR)"
            valueEn={hero.secondary_cta_label.en} valueAr={hero.secondary_cta_label.ar}
            onChangeEn={v => setHero(h => h ? { ...h, secondary_cta_label: { ...h.secondary_cta_label, en: v } } : h)}
            onChangeAr={v => setHero(h => h ? { ...h, secondary_cta_label: { ...h.secondary_cta_label, ar: v } } : h)} />
          <label className={cn(labelClass, 'mt-3')}>Secondary CTA URL</label>
          <input type="url" value={hero.secondary_cta_url} onChange={e => setHero(h => h ? { ...h, secondary_cta_url: e.target.value } : h)} dir="ltr" className={cn(inputClass, 'mt-1.5')} />
        </div>
      </div>

      <ImageUploadBox url={imagePreview ?? hero.image} label="Hero Image" onFile={handleImageFile} onClear={() => { setImageFile(null); setImagePreview(null); setHero(h => h ? { ...h, image: null } : h); }} />

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: How It Works
// ═════════════════════════════════════════════════════════════════════════════
interface StepForm { title_ar: string; title_en: string; description_ar: string; description_en: string; iconFile?: File; iconPreview?: string }
const emptyStepForm = (): StepForm => ({ title_ar: '', title_en: '', description_ar: '', description_en: '' });

function HowItWorksSection({ token }: { token: string }) {
  const [steps, setSteps] = useState<LandingHowItWorksStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; step: LandingHowItWorksStep } | { mode: 'delete'; step: LandingHowItWorksStep }>(null);
  const [form, setForm] = useState<StepForm>(emptyStepForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLandingHowItWorks(token).then(r => setSteps(r.data?.items ?? [])).catch(() => toast.error('فشل جلب الخطوات')).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const moveStep = (idx: number, dir: 'up' | 'down') => {
    const arr = [...steps];
    if (dir === 'up' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    else if (dir === 'down' && idx < arr.length - 1) [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setSteps(arr);
  };

  const saveReorder = async () => {
    setSaving(true);
    try {
      await reorderHowItWorks(steps.map((s, i) => ({ id: s.id, sort: i })), token);
      toast.success('تم إعادة الترتيب');
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const submitForm = async () => {
    setFormSaving(true);
    try {
      if (modal?.mode === 'add') { await createHowItWorksStep({ ...form, icon: form.iconFile }, token); }
      else if (modal?.mode === 'edit') { await updateHowItWorksStep(modal.step.id, { ...form, icon: form.iconFile }, token); }
      toast.success('تم الحفظ بنجاح'); setModal(null); load();
    } catch (e) { toast.error((e as Error).message); } finally { setFormSaving(false); }
  };

  const doDelete = async () => {
    if (modal?.mode !== 'delete') return;
    setDeleting(true);
    try { await deleteHowItWorksStep(modal.step.id, token); toast.success('تم الحذف'); setModal(null); load(); }
    catch (e) { toast.error((e as Error).message); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary">الخطوات <span className="text-secondary/40 font-normal text-sm">({steps.length})</span></span>
        <div className="flex gap-2">
          <button onClick={saveReorder} disabled={saving || loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-secondary/20 rounded-xl text-sm font-medium text-secondary/70 hover:text-secondary transition-colors cursor-pointer disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} حفظ الترتيب
          </button>
          <button onClick={() => { setForm(emptyStepForm()); setModal({ mode: 'add' }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> إضافة خطوة
          </button>
        </div>
      </div>

      {loading ? <SectionSkeleton /> : (
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <motion.div key={step.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-3 p-4 bg-white/40 border border-secondary/10 rounded-2xl group hover:bg-white/60 transition-colors shadow-sm">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer transition-colors"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveStep(idx, 'down')} disabled={idx === steps.length - 1} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer transition-colors"><ArrowDown className="w-3.5 h-3.5" /></button>
              </div>
              {step.icon_url && <div className="w-10 h-10 rounded-xl bg-secondary/5 overflow-hidden shrink-0 relative"><Image src={step.icon_url} alt={step.title} fill className="object-contain p-1" /></div>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-secondary text-sm">{step.title}</p>
                <p className="text-xs text-secondary/50 mt-0.5 truncate">{step.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setForm({ title_ar: step.title, title_en: step.title, description_ar: step.description, description_en: step.description }); setModal({ mode: 'edit', step }); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> تعديل
                </button>
                <button onClick={() => setModal({ mode: 'delete', step })}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </motion.div>
          ))}
          {steps.length === 0 && <div className="text-center py-12 text-secondary/40 text-sm">لم تتم إضافة خطوات بعد.</div>}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(modal?.mode === 'add' || modal?.mode === 'edit') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                <h3 className="font-bold text-secondary">{modal?.mode === 'add' ? 'إضافة خطوة جديدة' : 'تعديل الخطوة'}</h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer transition-colors"><X className="w-5 h-5 text-secondary/60" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <ImageUploadBox url={form.iconPreview ?? null} label="Icon Image" aspect="aspect-square max-w-[120px]"
                  onFile={f => { setForm(v => ({ ...v, iconFile: f, iconPreview: URL.createObjectURL(f) })); }}
                  onClear={() => setForm(v => ({ ...v, iconFile: undefined, iconPreview: undefined }))} />
                <BilingualField labelEn="Title (EN)" labelAr="العنوان (AR)" valueEn={form.title_en} valueAr={form.title_ar}
                  onChangeEn={v => setForm(f => ({ ...f, title_en: v }))} onChangeAr={v => setForm(f => ({ ...f, title_ar: v }))} />
                <BilingualField labelEn="Description (EN)" labelAr="الوصف (AR)" valueEn={form.description_en} valueAr={form.description_ar}
                  onChangeEn={v => setForm(f => ({ ...f, description_en: v }))} onChangeAr={v => setForm(f => ({ ...f, description_ar: v }))} multiline />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-secondary/10">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-secondary/8 text-secondary font-semibold text-sm cursor-pointer hover:bg-secondary/15 transition-colors">إلغاء</button>
                <button onClick={submitForm} disabled={formSaving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modal?.mode === 'delete' && <DeleteConfirm label={modal.step.title} onConfirm={doDelete} onCancel={() => setModal(null)} loading={deleting} />}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Features
// ═════════════════════════════════════════════════════════════════════════════
function FeaturesSection({ token }: { token: string }) {
  const [features, setFeatures] = useState<LandingFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; feat: LandingFeature } | { mode: 'delete'; feat: LandingFeature }>(null);
  const [form, setForm] = useState<StepForm>(emptyStepForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLandingFeatures(token).then(r => setFeatures(r.data?.items ?? [])).catch(() => toast.error('فشل جلب الميزات')).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    const arr = [...features];
    if (dir === 'up' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    else if (dir === 'down' && idx < arr.length - 1) [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setFeatures(arr);
  };
  const saveReorder = async () => {
    setSaving(true);
    try { await reorderFeatures(features.map((f, i) => ({ id: f.id, sort: i })), token); toast.success('تم إعادة الترتيب'); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  const submitForm = async () => {
    setFormSaving(true);
    try {
      if (modal?.mode === 'add') await createFeature({ ...form, icon: form.iconFile }, token);
      else if (modal?.mode === 'edit') await updateFeature(modal.feat.id, { ...form, icon: form.iconFile }, token);
      toast.success('تم الحفظ'); setModal(null); load();
    } catch (e) { toast.error((e as Error).message); } finally { setFormSaving(false); }
  };
  const doDelete = async () => {
    if (modal?.mode !== 'delete') return;
    setDeleting(true);
    try { await deleteFeature(modal.feat.id, token); toast.success('تم الحذف'); setModal(null); load(); }
    catch (e) { toast.error((e as Error).message); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary">الميزات <span className="text-secondary/40 font-normal text-sm">({features.length})</span></span>
        <div className="flex gap-2">
          <button onClick={saveReorder} disabled={saving || loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-secondary/20 rounded-xl text-sm font-medium text-secondary/70 hover:text-secondary transition-colors cursor-pointer disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} حفظ الترتيب
          </button>
          <button onClick={() => { setForm(emptyStepForm()); setModal({ mode: 'add' }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> إضافة ميزة
          </button>
        </div>
      </div>
      {loading ? <SectionSkeleton /> : (
        <div className="space-y-3">
          {features.map((feat, idx) => (
            <motion.div key={feat.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-3 p-4 bg-white/40 border border-secondary/10 rounded-2xl group hover:bg-white/60 transition-colors shadow-sm">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveItem(idx, 'down')} disabled={idx === features.length - 1} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
              </div>
              {feat.icon_url && <div className="w-10 h-10 rounded-xl bg-secondary/5 overflow-hidden shrink-0 relative"><Image src={feat.icon_url} alt={feat.title} fill className="object-contain p-1" /></div>}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-secondary text-sm">{feat.title}</p>
                <p className="text-xs text-secondary/50 mt-0.5 truncate">{feat.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setForm({ title_ar: feat.title, title_en: feat.title, description_ar: feat.description, description_en: feat.description }); setModal({ mode: 'edit', feat }); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> تعديل
                </button>
                <button onClick={() => setModal({ mode: 'delete', feat })}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </motion.div>
          ))}
          {features.length === 0 && <div className="text-center py-12 text-secondary/40 text-sm">لم تتم إضافة ميزات بعد.</div>}
        </div>
      )}
      <AnimatePresence>
        {(modal?.mode === 'add' || modal?.mode === 'edit') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                <h3 className="font-bold text-secondary">{modal?.mode === 'add' ? 'إضافة ميزة' : 'تعديل الميزة'}</h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer"><X className="w-5 h-5 text-secondary/60" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <ImageUploadBox url={form.iconPreview ?? null} label="Icon Image" aspect="aspect-square max-w-[120px]"
                  onFile={f => setForm(v => ({ ...v, iconFile: f, iconPreview: URL.createObjectURL(f) }))}
                  onClear={() => setForm(v => ({ ...v, iconFile: undefined, iconPreview: undefined }))} />
                <BilingualField labelEn="Title (EN)" labelAr="العنوان (AR)" valueEn={form.title_en} valueAr={form.title_ar}
                  onChangeEn={v => setForm(f => ({ ...f, title_en: v }))} onChangeAr={v => setForm(f => ({ ...f, title_ar: v }))} />
                <BilingualField labelEn="Description (EN)" labelAr="الوصف (AR)" valueEn={form.description_en} valueAr={form.description_ar}
                  onChangeEn={v => setForm(f => ({ ...f, description_en: v }))} onChangeAr={v => setForm(f => ({ ...f, description_ar: v }))} multiline />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-secondary/10">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-secondary/8 text-secondary font-semibold text-sm cursor-pointer hover:bg-secondary/15 transition-colors">إلغاء</button>
                <button onClick={submitForm} disabled={formSaving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modal?.mode === 'delete' && <DeleteConfirm label={modal.feat.title} onConfirm={doDelete} onCancel={() => setModal(null)} loading={deleting} />}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Portfolio
// ═════════════════════════════════════════════════════════════════════════════
interface PortfolioForm { name_ar: string; name_en: string; imageFile?: File; imagePreview?: string }
const emptyPortfolioForm = (): PortfolioForm => ({ name_ar: '', name_en: '' });

function PortfolioSection({ token }: { token: string }) {
  const [items, setItems] = useState<LandingPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; item: LandingPortfolioItem } | { mode: 'delete'; item: LandingPortfolioItem }>(null);
  const [form, setForm] = useState<PortfolioForm>(emptyPortfolioForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLandingPortfolio(token).then(r => setItems(r.data?.items ?? [])).catch(() => toast.error('فشل جلب Portfolio')).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const moveItem = (idx: number, dir: 'up' | 'down') => {
    const arr = [...items];
    if (dir === 'up' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    else if (dir === 'down' && idx < arr.length - 1) [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setItems(arr);
  };
  const saveReorder = async () => {
    setSaving(true);
    try { await reorderPortfolio(items.map((it, i) => ({ id: it.id, sort: i })), token); toast.success('تم إعادة الترتيب'); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  const submitForm = async () => {
    setFormSaving(true);
    try {
      if (modal?.mode === 'add') await createPortfolioItem({ ...form, image: form.imageFile }, token);
      else if (modal?.mode === 'edit') await updatePortfolioItem(modal.item.id, { ...form, image: form.imageFile }, token);
      toast.success('تم الحفظ'); setModal(null); load();
    } catch (e) { toast.error((e as Error).message); } finally { setFormSaving(false); }
  };
  const doDelete = async () => {
    if (modal?.mode !== 'delete') return;
    setDeleting(true);
    try { await deletePortfolioItem(modal.item.id, token); toast.success('تم الحذف'); setModal(null); load(); }
    catch (e) { toast.error((e as Error).message); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary">معرض الأعمال <span className="text-secondary/40 font-normal text-sm">({items.length})</span></span>
        <div className="flex gap-2">
          <button onClick={saveReorder} disabled={saving || loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-secondary/20 rounded-xl text-sm font-medium text-secondary/70 hover:text-secondary transition-colors cursor-pointer disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} حفظ الترتيب
          </button>
          <button onClick={() => { setForm(emptyPortfolioForm()); setModal({ mode: 'add' }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> إضافة عنصر
          </button>
        </div>
      </div>
      {loading ? <SectionSkeleton /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <motion.div key={item.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
              className="bg-white/40 border border-secondary/10 rounded-2xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
              <div className="aspect-video relative bg-secondary/5">
                {item.image
                  ? <Image src={item.image} alt={item.name} fill className="object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><LayoutGrid className="w-8 h-8 text-secondary/20" /></div>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => { setForm({ name_ar: item.name, name_en: item.name }); setModal({ mode: 'edit', item }); }}
                    className="p-2 bg-white rounded-xl cursor-pointer hover:bg-secondary/10 transition-colors"><Pencil className="w-4 h-4 text-secondary" /></button>
                  <button onClick={() => setModal({ mode: 'delete', item })}
                    className="p-2 bg-red-500 text-white rounded-xl cursor-pointer hover:bg-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <p className="font-semibold text-secondary text-sm truncate">{item.name}</p>
                <div className="flex gap-0.5 shrink-0">
                  <button onClick={() => moveItem(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowUp className="w-3.5 h-3.5 text-secondary/60" /></button>
                  <button onClick={() => moveItem(idx, 'down')} disabled={idx === items.length - 1} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowDown className="w-3.5 h-3.5 text-secondary/60" /></button>
                </div>
              </div>
            </motion.div>
          ))}
          {items.length === 0 && <div className="col-span-full text-center py-12 text-secondary/40 text-sm">لم تتم إضافة عناصر بعد.</div>}
        </div>
      )}
      <AnimatePresence>
        {(modal?.mode === 'add' || modal?.mode === 'edit') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                <h3 className="font-bold text-secondary">{modal?.mode === 'add' ? 'إضافة عنصر' : 'تعديل العنصر'}</h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer"><X className="w-5 h-5 text-secondary/60" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <ImageUploadBox url={form.imagePreview ?? (modal?.mode === 'edit' ? modal.item.image : null)} label="Portfolio Image"
                  onFile={f => setForm(v => ({ ...v, imageFile: f, imagePreview: URL.createObjectURL(f) }))}
                  onClear={() => setForm(v => ({ ...v, imageFile: undefined, imagePreview: undefined }))} />
                <BilingualField labelEn="Name (EN)" labelAr="الاسم (AR)" valueEn={form.name_en} valueAr={form.name_ar}
                  onChangeEn={v => setForm(f => ({ ...f, name_en: v }))} onChangeAr={v => setForm(f => ({ ...f, name_ar: v }))} />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-secondary/10">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-secondary/8 text-secondary font-semibold text-sm cursor-pointer hover:bg-secondary/15 transition-colors">إلغاء</button>
                <button onClick={submitForm} disabled={formSaving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modal?.mode === 'delete' && <DeleteConfirm label={modal.item.name} onConfirm={doDelete} onCancel={() => setModal(null)} loading={deleting} />}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Social Links
// ═════════════════════════════════════════════════════════════════════════════
interface SLForm { platform: string; url: string; label_ar: string; label_en: string }
const emptySLForm = (): SLForm => ({ platform: 'instagram', url: '', label_ar: '', label_en: '' });

function SocialLinksSection({ token }: { token: string }) {
  const [links, setLinks] = useState<LandingSocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; link: LandingSocialLink } | { mode: 'delete'; link: LandingSocialLink }>(null);
  const [form, setForm] = useState<SLForm>(emptySLForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLandingSocialLinks(token).then(r => setLinks(r.data?.items ?? [])).catch(() => toast.error('فشل جلب الروابط')).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const moveLink = (idx: number, dir: 'up' | 'down') => {
    const arr = [...links];
    if (dir === 'up' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    else if (dir === 'down' && idx < arr.length - 1) [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setLinks(arr);
  };
  const saveReorder = async () => {
    setSaving(true);
    try { await reorderSocialLinks(links.map((l, i) => ({ id: l.id, sort: i })), token); toast.success('تم إعادة الترتيب'); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  const submitForm = async () => {
    setFormSaving(true);
    try {
      if (modal?.mode === 'add') await createSocialLink(form, token);
      else if (modal?.mode === 'edit') await updateSocialLink(modal.link.id, form, token);
      toast.success('تم الحفظ'); setModal(null); load();
    } catch (e) { toast.error((e as Error).message); } finally { setFormSaving(false); }
  };
  const doDelete = async () => {
    if (modal?.mode !== 'delete') return;
    setDeleting(true);
    try { await deleteSocialLink(modal.link.id, token); toast.success('تم الحذف'); setModal(null); load(); }
    catch (e) { toast.error((e as Error).message); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary">روابط التواصل <span className="text-secondary/40 font-normal text-sm">({links.length})</span></span>
        <div className="flex gap-2">
          <button onClick={saveReorder} disabled={saving || loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-secondary/20 rounded-xl text-sm font-medium text-secondary/70 hover:text-secondary transition-colors cursor-pointer disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} حفظ الترتيب
          </button>
          <button onClick={() => { setForm(emptySLForm()); setModal({ mode: 'add' }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> إضافة رابط
          </button>
        </div>
      </div>
      {loading ? <SectionSkeleton /> : (
        <div className="space-y-3">
          {links.map((link, idx) => {
            const Icon = getSocialIcon(link.platform);
            return (
              <motion.div key={link.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                className="flex items-center gap-3 p-4 bg-white/40 border border-secondary/10 rounded-2xl group hover:bg-white/60 transition-colors shadow-sm">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveLink(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveLink(idx, 'down')} disabled={idx === links.length - 1} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-secondary text-sm capitalize">{link.platform}</p>
                  <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-primary/70 truncate hover:underline flex items-center gap-1">
                    <Link className="w-3 h-3 shrink-0" />{link.url}
                  </a>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setForm({ platform: link.platform, url: link.url, label_ar: '', label_en: '' }); setModal({ mode: 'edit', link }); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> تعديل
                  </button>
                  <button onClick={() => setModal({ mode: 'delete', link })}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </button>
                </div>
              </motion.div>
            );
          })}
          {links.length === 0 && <div className="text-center py-12 text-secondary/40 text-sm">لم تتم إضافة روابط بعد.</div>}
        </div>
      )}
      <AnimatePresence>
        {(modal?.mode === 'add' || modal?.mode === 'edit') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                <h3 className="font-bold text-secondary">{modal?.mode === 'add' ? 'إضافة رابط' : 'تعديل الرابط'}</h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer"><X className="w-5 h-5 text-secondary/60" /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className={labelClass}>المنصة / Platform</label>
                  <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className={cn(inputClass, 'cursor-pointer')}>
                    {SOCIAL_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>URL</label>
                  <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} dir="ltr" className={cn(inputClass, 'text-left')} placeholder="https://" />
                </div>
                <BilingualField labelEn="Label (EN)" labelAr="التسمية (AR)" valueEn={form.label_en} valueAr={form.label_ar}
                  onChangeEn={v => setForm(f => ({ ...f, label_en: v }))} onChangeAr={v => setForm(f => ({ ...f, label_ar: v }))} />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-secondary/10">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-secondary/8 text-secondary font-semibold text-sm cursor-pointer hover:bg-secondary/15 transition-colors">إلغاء</button>
                <button onClick={submitForm} disabled={formSaving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modal?.mode === 'delete' && <DeleteConfirm label={modal.link.platform} onConfirm={doDelete} onCancel={() => setModal(null)} loading={deleting} />}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Footer
// ═════════════════════════════════════════════════════════════════════════════
function FooterSection({ token }: { token: string }) {
  const [footer, setFooter] = useState<LandingFooter | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLandingFooter(token).then(r => setFooter(r.data ?? null)).catch(() => toast.error('فشل جلب بيانات Footer')).finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!footer) return;
    setSaving(true);
    try {
      await updateLandingFooter({ brand_name_ar: footer.brand_name, brand_name_en: footer.brand_name, tagline_ar: footer.tagline, tagline_en: footer.tagline, description_ar: footer.description, description_en: footer.description, copyright: footer.copyright, logo: logoFile }, token);
      toast.success('تم تحديث Footer بنجاح');
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  if (loading) return <SectionSkeleton />;
  if (!footer) return null;

  return (
    <div className="space-y-6">
      <BilingualField labelEn="Brand Name (EN)" labelAr="اسم العلامة (AR)"
        valueEn={footer.brand_name} valueAr={footer.brand_name}
        onChangeEn={v => setFooter(f => f ? { ...f, brand_name: v } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, brand_name: v } : f)} />

      <BilingualField labelEn="Tagline (EN)" labelAr="الشعار (AR)"
        valueEn={footer.tagline} valueAr={footer.tagline}
        onChangeEn={v => setFooter(f => f ? { ...f, tagline: v } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, tagline: v } : f)} />

      <BilingualField labelEn="Description (EN)" labelAr="الوصف (AR)"
        valueEn={footer.description} valueAr={footer.description}
        onChangeEn={v => setFooter(f => f ? { ...f, description: v } : f)}
        onChangeAr={v => setFooter(f => f ? { ...f, description: v } : f)} multiline />

      <div>
        <label className={labelClass}>Copyright</label>
        <input type="text" value={footer.copyright} onChange={e => setFooter(f => f ? { ...f, copyright: e.target.value } : f)} dir="ltr" className={cn(inputClass, 'text-left')} />
      </div>

      <ImageUploadBox url={logoPreview ?? footer.logo_url} label="Logo"
        aspect="aspect-[3/1] max-w-[300px]"
        onFile={f => { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }}
        onClear={() => { setLogoFile(null); setLogoPreview(null); }} />

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Contact
// ═════════════════════════════════════════════════════════════════════════════
function ContactSection({ token }: { token: string }) {
  const [contact, setContact] = useState<LandingContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getLandingContact(token).then(r => setContact(r.data ?? null)).catch(() => toast.error('فشل جلب معلومات التواصل')).finally(() => setLoading(false));
  }, [token]);

  const handleSave = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      await updateLandingContact({ whatsapp_country_code: contact.whatsapp_country_code, whatsapp_phone: contact.whatsapp_phone, office_address_ar: contact.office_address.ar, office_address_en: contact.office_address.en, google_maps_url: contact.google_maps_url }, token);
      toast.success('تم تحديث معلومات التواصل');
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  if (loading) return <SectionSkeleton />;
  if (!contact) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>رمز البلد (Country Code)</label>
          <input type="text" value={contact.whatsapp_country_code} onChange={e => setContact(c => c ? { ...c, whatsapp_country_code: e.target.value } : c)} dir="ltr" className={cn(inputClass, 'text-left')} placeholder="+965" />
        </div>
        <div>
          <label className={labelClass}>رقم الواتساب (WhatsApp Phone)</label>
          <input type="text" value={contact.whatsapp_phone} onChange={e => setContact(c => c ? { ...c, whatsapp_phone: e.target.value } : c)} dir="ltr" className={cn(inputClass, 'text-left')} />
        </div>
      </div>

      <BilingualField labelEn="Office Address (EN)" labelAr="عنوان المكتب (AR)"
        valueEn={contact.office_address.en} valueAr={contact.office_address.ar}
        onChangeEn={v => setContact(c => c ? { ...c, office_address: { ...c.office_address, en: v } } : c)}
        onChangeAr={v => setContact(c => c ? { ...c, office_address: { ...c.office_address, ar: v } } : c)} />

      <div>
        <label className={labelClass}>Google Maps URL</label>
        <input type="url" value={contact.google_maps_url} onChange={e => setContact(c => c ? { ...c, google_maps_url: e.target.value } : c)} dir="ltr" className={cn(inputClass, 'text-left')} placeholder="https://maps.google.com/..." />
      </div>

      {/* Social links (read-only display — managed in the Social Links section) */}
      {contact.social_links.length > 0 && (
        <div className="bg-secondary/3 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-secondary/40 uppercase tracking-wider mb-3">روابط التواصل المرتبطة</p>
          {contact.social_links.map(sl => {
            const Icon = getSocialIcon(sl.platform);
            return (
              <div key={sl.id} className="flex items-center gap-3 text-sm">
                <Icon className="w-4 h-4 text-secondary/50 shrink-0" />
                <a href={sl.url} target="_blank" rel="noreferrer" className="text-primary/70 hover:underline truncate">{sl.url}</a>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION: Event Types
// ═════════════════════════════════════════════════════════════════════════════
interface ETForm { name_ar: string; name_en: string }
const emptyETForm = (): ETForm => ({ name_ar: '', name_en: '' });

function EventTypesSection({ token }: { token: string }) {
  const [types, setTypes] = useState<LandingEventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<null | { mode: 'add' } | { mode: 'edit'; et: LandingEventType } | { mode: 'delete'; et: LandingEventType }>(null);
  const [form, setForm] = useState<ETForm>(emptyETForm());
  const [formSaving, setFormSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLandingEventTypes(token).then(r => setTypes(r.data?.items ?? [])).catch(() => toast.error('فشل جلب أنواع الفعاليات')).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const moveType = (idx: number, dir: 'up' | 'down') => {
    const arr = [...types];
    if (dir === 'up' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    else if (dir === 'down' && idx < arr.length - 1) [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setTypes(arr);
  };
  const saveReorder = async () => {
    setSaving(true);
    try { await reorderEventTypes(types.map((t, i) => ({ id: t.id, sort: i })), token); toast.success('تم إعادة الترتيب'); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  const submitForm = async () => {
    setFormSaving(true);
    try {
      if (modal?.mode === 'add') await createEventType(form, token);
      else if (modal?.mode === 'edit') await updateEventType(modal.et.id, form, token);
      toast.success('تم الحفظ'); setModal(null); load();
    } catch (e) { toast.error((e as Error).message); } finally { setFormSaving(false); }
  };
  const doDelete = async () => {
    if (modal?.mode !== 'delete') return;
    setDeleting(true);
    try { await deleteEventType(modal.et.id, token); toast.success('تم الحذف'); setModal(null); load(); }
    catch (e) { toast.error((e as Error).message); } finally { setDeleting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
        <span className="font-semibold text-secondary">أنواع الفعاليات <span className="text-secondary/40 font-normal text-sm">({types.length})</span></span>
        <div className="flex gap-2">
          <button onClick={saveReorder} disabled={saving || loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-secondary/20 rounded-xl text-sm font-medium text-secondary/70 hover:text-secondary transition-colors cursor-pointer disabled:opacity-50 shadow-sm">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} حفظ الترتيب
          </button>
          <button onClick={() => { setForm(emptyETForm()); setModal({ mode: 'add' }); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-xl text-sm font-medium cursor-pointer hover:bg-primary-dark transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> إضافة نوع
          </button>
        </div>
      </div>
      {loading ? <SectionSkeleton /> : (
        <div className="space-y-3">
          {types.map((et, idx) => (
            <motion.div key={et.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="flex items-center gap-3 p-4 bg-white/40 border border-secondary/10 rounded-2xl group hover:bg-white/60 transition-colors shadow-sm">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveType(idx, 'up')} disabled={idx === 0} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowUp className="w-3.5 h-3.5" /></button>
                <button onClick={() => moveType(idx, 'down')} disabled={idx === types.length - 1} className="p-1 hover:bg-secondary/10 rounded-lg disabled:opacity-25 cursor-pointer"><ArrowDown className="w-3.5 h-3.5" /></button>
              </div>
              <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">{idx + 1}</span>
              <p className="flex-1 font-semibold text-secondary text-sm">{et.name}</p>
              <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setForm({ name_ar: et.name, name_en: et.name }); setModal({ mode: 'edit', et }); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                  <Pencil className="w-3.5 h-3.5" /> تعديل
                </button>
                <button onClick={() => setModal({ mode: 'delete', et })}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-medium cursor-pointer hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </motion.div>
          ))}
          {types.length === 0 && <div className="text-center py-12 text-secondary/40 text-sm">لم تتم إضافة أنواع بعد.</div>}
        </div>
      )}
      <AnimatePresence>
        {(modal?.mode === 'add' || modal?.mode === 'edit') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setModal(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }} onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-secondary/10">
                <h3 className="font-bold text-secondary">{modal?.mode === 'add' ? 'إضافة نوع فعالية' : 'تعديل النوع'}</h3>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-secondary/10 rounded-xl cursor-pointer"><X className="w-5 h-5 text-secondary/60" /></button>
              </div>
              <div className="p-6 space-y-4">
                <BilingualField labelEn="Name (EN)" labelAr="الاسم (AR)" valueEn={form.name_en} valueAr={form.name_ar}
                  onChangeEn={v => setForm(f => ({ ...f, name_en: v }))} onChangeAr={v => setForm(f => ({ ...f, name_ar: v }))} />
              </div>
              <div className="flex gap-3 px-6 py-4 border-t border-secondary/10">
                <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl bg-secondary/8 text-secondary font-semibold text-sm cursor-pointer hover:bg-secondary/15 transition-colors">إلغاء</button>
                <button onClick={submitForm} disabled={formSaving} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm cursor-pointer hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {formSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {modal?.mode === 'delete' && <DeleteConfirm label={modal.et.name} onConfirm={doDelete} onCancel={() => setModal(null)} loading={deleting} />}
      </AnimatePresence>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

const SECTIONS = [
  { id: 'hero',         title: 'Hero Section',      titleAr: 'القسم الرئيسي',     icon: ImageIcon,    description: 'Manage the main banner, title, CTA buttons, and image.',           descAr: 'إدارة البانر الرئيسي والعنوان وأزرار الدعوة.' },
  { id: 'how-it-works', title: 'How It Works',      titleAr: 'كيف يعمل',          icon: CheckCircle2, description: 'Manage the steps shown in the "How It Works" section.',            descAr: 'إدارة خطوات قسم "كيف يعمل".' },
  { id: 'features',     title: 'Features',          titleAr: 'الميزات',            icon: Sparkles,     description: 'Edit the key features shown on the landing page.',                 descAr: 'تعديل الميزات الرئيسية المعروضة.' },
  { id: 'portfolio',    title: 'Portfolio',         titleAr: 'معرض الأعمال',       icon: LayoutGrid,   description: 'Manage portfolio items and their images.',                         descAr: 'إدارة عناصر معرض الأعمال وصورها.' },
  { id: 'social-links', title: 'Social Links',      titleAr: 'روابط التواصل',      icon: Link,         description: 'Manage social media links displayed on the landing page.',         descAr: 'إدارة روابط وسائل التواصل الاجتماعي.' },
  { id: 'footer',       title: 'Footer',            titleAr: 'تذييل الصفحة',       icon: Footprints,   description: 'Manage brand name, tagline, copyright text, and logo.',            descAr: 'إدارة اسم العلامة والشعار وحقوق النشر.' },
  { id: 'contact',      title: 'Contact Info',      titleAr: 'معلومات التواصل',    icon: Phone,        description: 'Manage WhatsApp number, office address, and map link.',            descAr: 'إدارة رقم الواتساب وعنوان المكتب.' },
  { id: 'event-types',  title: 'Event Types',       titleAr: 'أنواع الفعاليات',    icon: CalendarDays, description: 'Manage event type options shown in the contact form.',              descAr: 'إدارة أنواع الفعاليات في نموذج التواصل.' },
];

function LandingPageContent() {
  const { dir } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('s');
  const token = getToken() ?? '';

  const BackIcon = dir === 'ltr' ? ArrowLeft : ArrowRight;
  const currentSection = SECTIONS.find(s => s.id === activeSection);

  const renderSection = () => {
    switch (activeSection) {
      case 'hero':         return <HeroSection token={token} />;
      case 'how-it-works': return <HowItWorksSection token={token} />;
      case 'features':     return <FeaturesSection token={token} />;
      case 'portfolio':    return <PortfolioSection token={token} />;
      case 'social-links': return <SocialLinksSection token={token} />;
      case 'footer':       return <FooterSection token={token} />;
      case 'contact':      return <ContactSection token={token} />;
      case 'event-types':  return <EventTypesSection token={token} />;
      default:             return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 px-2">
        <AnimatePresence mode="wait">
          {activeSection && (
            <motion.button key="back" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => router.push('/landingPage')}
              className="p-2.5 rounded-xl bg-white/40 hover:bg-white/60 shadow-sm transition-colors text-secondary cursor-pointer shrink-0">
              <BackIcon className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
        <div>
          <h2 className={cn('text-2xl font-semibold text-secondary flex items-center gap-2', dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
            {currentSection ? (
              <><currentSection.icon className="w-6 h-6 text-primary shrink-0" />
                {dir === 'ltr' ? currentSection.title : currentSection.titleAr}</>
            ) : (dir === 'rtl' ? 'صفحة الهبوط' : 'Landing Page')}
          </h2>
          <p className="text-sm text-secondary/55 mt-0.5">
            {currentSection
              ? (dir === 'ltr' ? currentSection.description : currentSection.descAr)
              : (dir === 'rtl' ? 'إدارة محتوى صفحة الهبوط العامة' : 'Manage the content of your public landing page.')}
          </p>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence mode="wait">
        {!activeSection ? (
          <motion.div key="grid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {SECTIONS.map((section, i) => (
              <motion.button key={section.id}
                onClick={() => router.push(`/landingPage?s=${section.id}`)}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.4 }}
                className="p-6 rounded-3xl glass-panel text-start hover:bg-white/60 transition-all shadow-sm border border-secondary/5 group flex flex-col gap-4 cursor-pointer hover:-translate-y-0.5">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <section.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-secondary mb-1">{dir === 'ltr' ? section.title : section.titleAr}</h3>
                  <p className="text-sm text-secondary/55 leading-relaxed">{dir === 'ltr' ? section.description : section.descAr}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div key={`s-${activeSection}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-3xl p-6 sm:p-8 min-h-[60vh]">
            {renderSection()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
      </div>
    }>
      <LandingPageContent />
    </Suspense>
  );
}
