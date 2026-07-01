'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Edit2, Trash2, SlidersHorizontal,
  XCircle, CheckCircle2, ChevronLeft, ChevronRight,
  AlertTriangle, Loader2, ChevronDown, AlignLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getAdminServiceOptions,
  getAdminServiceOptionById,
  createAdminServiceOption,
  updateAdminServiceOption,
  deleteAdminServiceOption,
  type ServiceOptionItem,
  type ServiceOptionDetailItem,
  type PaginatedItems
} from '@/lib/api';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

/* ─── Per-page options ─────────────────────────────────────────── */
const PER_PAGE_OPTIONS = [10, 15, 25, 50];

/* ─── Toggle Switch Component ───────────────────────────────────── */
function ToggleSwitch({
  checked, onChange, label, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <span className="text-sm font-medium text-secondary/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
          checked ? 'bg-primary' : 'bg-secondary/20',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  );
}

/* ─── Service Option Form (Create / Edit) ───────────────────────── */
interface OptionFormProps {
  option: ServiceOptionItem | null;
  onBack: () => void;
  onSaved: (opt: ServiceOptionItem) => void;
}

interface OptionFormValues {
  nameAr: string;
  nameEn: string;
  type: 'text' | 'number' | 'color' | 'employee' | 'list';
  isRequired: boolean;
}

function OptionForm({ option, onBack, onSaved }: OptionFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  // Form fields
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(option !== null);
  const [labels, setLabels] = useState<Array<{ label_ar: string; label_en: string }>>([]);

  const schema = React.useMemo(() => z.object({
    nameAr: z.string().min(1, { message: t('nameArRequired') }),
    nameEn: z.string().min(1, { message: t('nameEnRequired') }),
    type: z.enum(['text', 'number', 'color', 'employee', 'list']),
    isRequired: z.boolean(),
  }), [t]);

  // Initialize React Hook Form
  const form = useForm<OptionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      type: 'text',
      isRequired: true,
    },
  });

  const typeValue = form.watch('type');

  // Initialize/Fetch form fields for edit mode
  useEffect(() => {
    if (option === null) {
      setFetchLoading(false);
      return;
    }
    setFetchLoading(true);
    getAdminServiceOptionById(option.id, token)
      .then(res => {
        const opt = res.data;
        form.reset({
          nameAr: opt.name_ar || '',
          nameEn: opt.name_en || '',
          type: opt.type,
          isRequired: opt.is_required,
        });

        // Load labels if list type
        if (opt.values && Array.isArray(opt.values)) {
          setLabels(
            opt.values.map(v => ({
              label_ar: v.value_ar || v.label_ar || v.value || '',
              label_en: v.value_en || v.label_en || v.value || '',
            }))
          );
        } else if (opt.labels && Array.isArray(opt.labels)) {
          setLabels(
            opt.labels.map(l => ({
              label_ar: l.label_ar || '',
              label_en: l.label_en || '',
            }))
          );
        } else {
          setLabels([]);
        }
      })
      .catch(err => {
        toast.error((err as Error).message ?? 'فشل جلب تفاصيل الخيار');
      })
      .finally(() => {
        setFetchLoading(false);
      });
  }, [option, token, form]);

  const onSubmit = async (values: OptionFormValues) => {
    setLoading(true);
    try {
      let res;
      if (option !== null) {
        res = await updateAdminServiceOption(
          option.id,
          {
            nameAr: values.nameAr,
            nameEn: values.nameEn,
            type: values.type,
            is_required: values.isRequired ? 1 : 0,
            labels: values.type === 'list' ? labels : undefined
          },
          token
        );
      } else {
        res = await createAdminServiceOption(
          {
            nameAr: values.nameAr,
            nameEn: values.nameEn,
            type: values.type,
            is_required: values.isRequired ? 1 : 0,
            labels: values.type === 'list' ? labels : undefined
          },
          token
        );
      }
      toast.success(res.msg);
      onSaved(res.data);
    } catch (err) {
      toast.error((err as Error).message ?? 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full text-start"
    >
      <div className="flex items-center justify-start mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
        >
          {dir === 'ltr'
            ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          <span className="font-medium">{t('back')}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn('text-2xl font-medium text-secondary mb-8', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {option !== null ? t('editOption') : t('addOption')}
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name Arabic */}
            <FormField
              control={form.control}
              name="nameAr"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
                    {t('nameAr')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      {...field}
                      className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name English */}
            <FormField
              control={form.control}
              name="nameEn"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
                    {t('nameEn')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <input
                      type="text"
                      {...field}
                      className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Option Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
                    {t('optionType')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none cursor-pointer"
                    >
                      <option value="text">{t('optionTypeText')}</option>
                      <option value="number">{t('optionTypeNumber')}</option>
                      <option value="color">{t('optionTypeColor')}</option>
                      <option value="employee">{t('optionTypeEmployee')}</option>
                      <option value="list">{t('optionTypeSelect')}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* is_required toggle switch */}
            <FormField
              control={form.control}
              name="isRequired"
              render={({ field }) => (
                <FormItem className="pt-2 space-y-0">
                  <FormControl>
                    <ToggleSwitch
                      checked={field.value}
                      onChange={field.onChange}
                      label={field.value ? t('optionRequired') : t('optional')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* List Labels (only for 'list' type) */}
            {typeValue === 'list' && (
              <div className="space-y-4 pt-4 border-t border-secondary/10">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-secondary/80">
                    {t('listOptionsLabels')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setLabels(prev => [...prev, { label_ar: '', label_en: '' }])}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-semibold hover:bg-primary/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t('addLabel')}
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {labels.map((label, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white/30 p-3 rounded-2xl border border-secondary/5">
                      {/* Arabic Label */}
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          required
                          dir="rtl"
                          placeholder={t('arLabelPlaceholder')}
                          value={label.label_ar}
                          onChange={e => {
                            const updated = [...labels];
                            updated[idx] = { ...updated[idx], label_ar: e.target.value };
                            setLabels(updated);
                          }}
                          className="w-full bg-white/50 border border-secondary/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30 text-right font-arabic"
                        />
                      </div>

                      {/* English Label */}
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          required
                          dir="ltr"
                          placeholder={t('enLabelPlaceholder')}
                          value={label.label_en}
                          onChange={e => {
                            const updated = [...labels];
                            updated[idx] = { ...updated[idx], label_en: e.target.value };
                            setLabels(updated);
                          }}
                          className="w-full bg-white/50 border border-secondary/20 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => setLabels(prev => prev.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {labels.length === 0 && (
                    <p className="text-center text-xs text-secondary/40 py-4">
                      {t('noLabelsAdded')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-secondary/10 mt-8">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : t('saveChanges')}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}

/* ─── Delete Option Modal ───────────────────────────────────────── */
interface DeleteModalProps {
  option: ServiceOptionItem;
  onClose: () => void;
  onConfirmed: () => void;
}

function DeleteOptionModal({ option, onClose, onConfirmed }: DeleteModalProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await deleteAdminServiceOption(option.id, token);
      toast.success(res.msg || t('deletedSuccessfully'));
      onConfirmed();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl"
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className={cn('text-xl font-semibold text-secondary mb-2', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('deleteOption')}
          </h3>
          <p className="text-secondary/70 mb-2">
            {t('deleteOptionMessage')}
          </p>
          <p className="text-sm font-semibold text-secondary mb-8">{option.name}</p>
          <div className="w-full flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-white/50 hover:bg-white/80 text-secondary border border-white/60 rounded-xl py-3 font-medium transition-all shadow-sm cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('remove')}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Pagination Component ───────────────────────────────────────── */
function Pagination({
  pagination, onPage,
}: {
  pagination: PaginatedItems<ServiceOptionItem>['pagination'];
  onPage: (p: number) => void;
}) {
  const { last_page, current_page } = pagination;
  if (last_page <= 1) return null;

  const pages = Array.from({ length: last_page }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
      <button
        onClick={() => onPage(current_page - 1)}
        disabled={current_page === 1}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={cn(
            'w-9 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer',
            p === current_page
              ? 'bg-primary text-white shadow-md'
              : 'bg-white/50 border border-secondary/10 hover:bg-white/80 text-secondary',
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(current_page + 1)}
        disabled={current_page === last_page}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Main Page Component ────────────────────────────────────────── */
type View = 'list' | 'form';

const OPTION_TYPE_EMOJIS: Record<string, string> = {
  text: '📝',
  number: '🔢',
  color: '🎨',
  employee: '👤',
  list: '📋',
};

export default function ServiceOptionsClient({
  initialData,
  initialPagination,
}: {
  initialData: ServiceOptionItem[] | null;
  initialPagination: PaginatedItems<ServiceOptionItem>['pagination'] | null;
}) {
  const { t, dir } = useLanguage();
  const [token] = useState(() => getToken() ?? '');

  // ── List State ──
  const [options, setOptions] = useState<ServiceOptionItem[]>(initialData ?? []);
  const [pagination, setPagination] = useState<PaginatedItems<ServiceOptionItem>['pagination'] | null>(initialPagination);
  const [listLoading, setListLoading] = useState(!initialData);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Navigation / Dialog State ──
  const [view, setView] = useState<View>('list');
  const [editOption, setEditOption] = useState<ServiceOptionItem | null>(null);
  const [deleteOption_, setDeleteOption_] = useState<ServiceOptionItem | null>(null);

  const isInitialMount = useRef(true);

  /* ── Fetch Options ── */
  const fetchOptions = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const res = await getAdminServiceOptions(token, { page, per_page: perPage });

      // Implement local keyword filtering if backend doesn't filter, or simply render
      let items = res.data.items || [];
      if (keyword) {
        const query = keyword.toLowerCase();
        items = items.filter(opt => opt.name.toLowerCase().includes(query) || opt.type.toLowerCase().includes(query));
      }

      setOptions(items);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setListLoading(false);
    }
  }, [token, page, perPage, keyword]);

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchOptions();
  }, [fetchOptions, initialData]);

  /* ── Debounced Search ── */
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
    }, 500);
  };

  /* ── Handle Save ── */
  const handleSaved = () => {
    setView('list');
    setEditOption(null);
    fetchOptions();
  };

  /* ── Handle Delete Complete ── */
  const handleDeleted = () => {
    setDeleteOption_(null);
    fetchOptions();
  };

  // RENDER FORM VIEW
  if (view === 'form') {
    return (
      <AnimatePresence mode="wait">
        <OptionForm
          key={editOption ? `edit-${editOption.id}` : 'new'}
          option={editOption}
          onBack={() => { setView('list'); setEditOption(null); }}
          onSaved={handleSaved}
        />
      </AnimatePresence>
    );
  }

  // RENDER LIST VIEW
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 pb-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('serviceOptions')}
          </h1>
          {pagination && (
            <p className="text-sm text-secondary/50 mt-1">
              {pagination.total} {t('optionsAvailable')}
            </p>
          )}
        </div>
        <button
          onClick={() => { setEditOption(null); setView('form'); }}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          {t('addOption')}
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
        {/* Search & per-page controls */}
        <div className="mb-5 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40', dir === 'ltr' ? 'left-3' : 'right-3')} />
            <input
              type="text"
              placeholder={t('searchOptionsPlaceholder')}
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className={cn(
                'w-full bg-white/50 border border-secondary/10 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm',
                dir === 'ltr' ? 'pl-9 pr-4' : 'pr-9 pl-4',
              )}
            />
          </div>

          {/* Per-page */}
          <div className="relative">
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="appearance-none bg-white/50 border border-secondary/10 rounded-xl px-4 py-2.5 pe-8 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} {t('perPage')}</option>
              ))}
            </select>
            <ChevronDown className="absolute top-1/2 -translate-y-1/2 end-2.5 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
          </div>
        </div>

        {/* List Content */}
        {listLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : options.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
            <SlidersHorizontal className="w-12 h-12 mb-4 opacity-50" />
            <p>{t('noDataFound')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3 w-full">
            <AnimatePresence mode="popLayout">
              {options.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:bg-white/60 transition-colors w-full text-start"
                >
                  {/* Left Column: Emoji, Name, Type */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-primary/10 border border-white/60 shadow flex items-center justify-center text-lg select-none">
                      {OPTION_TYPE_EMOJIS[opt.type] || '⚙️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-secondary text-base truncate">{opt.name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center text-sm text-secondary/60 gap-1 sm:gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-blue-50 text-blue-700 border-blue-200">
                          {opt.type === 'list' ? t('optionTypeSelect') : t(`optionType${opt.type.charAt(0).toUpperCase() + opt.type.slice(1)}` as any)}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                          opt.is_required ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-stone-50 text-stone-500 border-stone-200',
                        )}>
                          {opt.is_required ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {opt.is_required ? t('optionRequired') : t('optional')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0">
                    <button
                      title={t('edit')}
                      onClick={() => { setEditOption(opt); setView('form'); }}
                      className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      title={t('remove')}
                      onClick={() => setDeleteOption_(opt)}
                      className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination && !listLoading && (
          <div className="mt-6">
            <Pagination pagination={pagination} onPage={p => setPage(p)} />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteOption_ && (
          <DeleteOptionModal
            option={deleteOption_}
            onClose={() => setDeleteOption_(null)}
            onConfirmed={handleDeleted}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
