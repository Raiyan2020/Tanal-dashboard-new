'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Ticket, Calendar, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { createInvitation } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface CreateInvitationModalProps {
  /** The event ID to pre-fill — the user cannot change it */
  eventId: number;
  /** Human-readable event name shown in the modal header */
  eventName: string;
  /** Event date to limit deadline options */
  eventDate?: string;
  onClose: () => void;
  /** Called after a successful creation so the parent can refresh state */
  onCreated: () => void;
}

interface FormValues {
  logic: 'strict' | 'default_accept' | 'view_only';
  deadlineDate: string;
  deadlineTime: string;
  designFile: any;
}

export function CreateInvitationModal({
  eventId,
  eventName,
  eventDate,
  onClose,
  onCreated,
}: CreateInvitationModalProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // DayPicker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const schema = React.useMemo(() => z.object({
    logic: z.enum(['strict', 'default_accept', 'view_only']),
    deadlineDate: z.string().min(1, { message: t('pleaseSelectDeadline') }),
    deadlineTime: z.string().min(1, { message: t('pleaseSelectDeadlineTime') }),
    designFile: z.any().refine(file => file instanceof File, { message: t('pleaseUploadDesign') }),
  }), [t]);

  // Initialize React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      logic: 'strict',
      deadlineDate: '',
      deadlineTime: '',
      designFile: undefined,
    },
  });

  // Watch deadlineDate
  const deadlineDateValue = form.watch('deadlineDate');

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const getMinAllowedDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const getMaxAllowedDate = () => {
    if (!eventDate) return undefined;
    const d = new Date(eventDate);
    if (isNaN(d.getTime())) return undefined;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getDisabledDays = () => {
    const minDate = getMinAllowedDate();
    const maxDate = getMaxAllowedDate();
    if (maxDate) {
      return { before: minDate, after: maxDate };
    }
    return { before: minDate };
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    form.setValue('deadlineDate', `${yyyy}-${mm}-${dd}`, { shouldValidate: true });
    setShowDatePicker(false);
  };

  const selectedDate = deadlineDateValue ? new Date(deadlineDateValue) : undefined;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      const file = e.dataTransfer.files[0];
      form.setValue('designFile', file, { shouldValidate: true });
      setFileName(file.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      form.setValue('designFile', file, { shouldValidate: true });
      setFileName(file.name);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (submitting) return;

    const mappedLogic = values.logic === 'strict' ? 'strict_action' : values.logic;
    setSubmitting(true);
    const formToast = toast.loading(t('creatingInvitation'));

    try {
      const res = await createInvitation(
        {
          event_id: String(eventId),
          logic_type: mappedLogic,
          deadline_date: values.deadlineDate,
          deadline_time: values.deadlineTime,
          design: values.designFile,
        },
        token
      );
      toast.dismiss(formToast);
      toast.success(res.msg || (dir === 'ltr' ? 'Invitation created successfully' : 'تم إنشاء الدعوة بنجاح'));
      onCreated();
      onClose();
    } catch (err) {
      toast.dismiss(formToast);
      toast.error((err as Error).message || (dir === 'ltr' ? 'Unexpected error' : 'حدث خطأ غير متوقع'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none text-start"
      >
        <div
          className="w-full max-w-lg glass-panel crystal-accent rounded-[2rem] border border-secondary/5 shadow-2xl overflow-hidden pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-secondary/8">
            <div>
              <h2 className={cn('text-lg font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {dir === 'ltr' ? 'Create Invitation' : 'إنشاء دعوة'}
              </h2>
              <p className="text-xs text-secondary/50 mt-0.5 flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                {eventName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-secondary/8 text-secondary/50 hover:text-secondary transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Logic type */}
              <FormField
                control={form.control}
                name="logic"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="block text-sm font-medium text-secondary/80">
                      {t('invitationLogic' as any) || (dir === 'ltr' ? 'Invitation Logic' : 'منطق الدعوة')}
                      <span className="text-red-500 ms-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        {([
                          {
                            id: 'strict' as const,
                            label: t('strictAction' as any) || (dir === 'ltr' ? 'Strict Action' : 'إجراء صارم'),
                            desc: t('strictActionDesc' as any) || (dir === 'ltr' ? 'No response → declined' : 'عدم الرد = مرفوضة'),
                          },
                          {
                            id: 'default_accept' as const,
                            label: t('defaultAccept' as any) || (dir === 'ltr' ? 'Default Accept' : 'قبول تلقائي'),
                            desc: t('defaultAcceptDesc' as any) || (dir === 'ltr' ? 'No response → accepted' : 'عدم الرد = مقبولة'),
                          },
                          {
                            id: 'view_only' as const,
                            label: t('viewOnly' as any) || (dir === 'ltr' ? 'View Only' : 'للعرض فقط'),
                            desc: t('viewOnlyDesc' as any) || (dir === 'ltr' ? 'Accepted immediately' : 'مقبولة فوراً للعلم'),
                          },
                        ] as const).map(opt => (
                          <label
                            key={opt.id}
                            className={cn(
                              'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors',
                              field.value === opt.id
                                ? 'border-primary/50 bg-primary/5'
                                : 'border-secondary/20 bg-white/50 hover:bg-white/80'
                            )}
                          >
                            <input
                              type="radio"
                              value={opt.id}
                              checked={field.value === opt.id}
                              onChange={() => field.onChange(opt.id)}
                              className="mt-0.5 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                            />
                            <div>
                              <span className="block text-sm font-medium text-secondary">{opt.label}</span>
                              <span className="block text-xs text-secondary/55 mt-0.5">{opt.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Design upload */}
              <FormField
                control={form.control}
                name="designFile"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="block text-sm font-medium text-secondary/80">
                      {t('uploadDesign' as any) || (dir === 'ltr' ? 'Upload Design' : 'رفع التصميم')} <span className="text-red-500 ms-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <div
                        onDragOver={e => e.preventDefault()}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-secondary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/50 hover:border-primary/30 transition-all bg-white/30"
                      >
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".png,.jpg,.jpeg,.webp"
                          onChange={handleFileSelect}
                        />
                        <Upload className="w-6 h-6 text-secondary/40 mb-2" />
                        <p className="text-sm font-medium text-secondary">
                          {fileName || (dir === 'ltr' ? 'Click or drag to upload' : 'انقر أو اسحب للرفع')}
                        </p>
                        <p className="text-xs text-secondary/50 mt-0.5">
                          PNG, JPG, WEBP — max 10MB
                        </p>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Deadline date + time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <FormField
                  control={form.control}
                  name="deadlineDate"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="block text-sm font-medium text-secondary/80 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-secondary/50" />
                        {t('deadline' as any) || (dir === 'ltr' ? 'Deadline' : 'الموعد النهائي')}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="relative" ref={datePickerRef}>
                        <FormControl>
                          <button
                            type="button"
                            onClick={() => setShowDatePicker(prev => !prev)}
                            className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 text-start text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all flex justify-between items-center cursor-pointer font-medium text-sm h-[46px]"
                          >
                            <span className={field.value ? '' : 'text-secondary/40'}>
                              {field.value || (dir === 'ltr' ? 'Select date...' : 'اختر التاريخ...')}
                            </span>
                            <Calendar className="w-4 h-4 text-secondary/40 shrink-0" />
                          </button>
                        </FormControl>
                        {showDatePicker && (
                          <div className="absolute z-[100] bottom-[10px] mt-2 p-3 bg-white border border-secondary/15 rounded-2xl shadow-xl left-0 rtl:right-0 rtl:left-auto">
                            <DayPicker
                              mode="single"
                              selected={selectedDate}
                              onSelect={handleDateSelect}
                              disabled={getDisabledDays()}
                              locale={dir === 'rtl' ? ar : undefined}
                              dir={dir}
                            />
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Time */}
                <FormField
                  control={form.control}
                  name="deadlineTime"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="block text-sm font-medium text-secondary/80 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-secondary/50" />
                        {t('deadlineTime' as any) || (dir === 'ltr' ? 'Time' : 'الوقت')}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary h-[46px] cursor-pointer"
                        >
                          <option value="">{dir === 'ltr' ? 'Select time...' : 'اختر الوقت...'}</option>
                          {Array.from({ length: 24 }, (_, h) => {
                            const period = h < 12 ? (dir === 'rtl' ? 'ص' : 'AM') : (dir === 'rtl' ? 'م' : 'PM');
                            const hour12 = h % 12 === 0 ? 12 : h % 12;
                            const label = `${String(hour12).padStart(2, '0')}:00 ${period}`;
                            const value = `${String(h).padStart(2, '0')}:00`;
                            return <option key={value} value={value}>{label}</option>;
                          })}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t border-secondary/10">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 rounded-xl border border-secondary/20 bg-white/50 text-secondary hover:bg-white/80 font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('cancel' as any) || (dir === 'ltr' ? 'Cancel' : 'إلغاء')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {dir === 'ltr' ? 'Creating...' : 'جاري الإنشاء...'}
                    </>
                  ) : (
                    dir === 'ltr' ? 'Create Invitation' : 'إنشاء الدعوة'
                  )}
                </button>
              </div>
            </form>
          </Form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
