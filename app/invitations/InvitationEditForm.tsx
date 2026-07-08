'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Upload, Ticket, Calendar, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { Invitation } from './InvitationsClient';
import { getEvents, getInvitationById, createInvitation, updateInvitation, type ApiEvent } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';

// Form UI imports
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface FormValues {
  eventId: string;
  logic: 'strict' | 'default_accept' | 'view_only';
  deadlineDate: string;
  deadlineTime: string;
}

interface InvitationEditFormProps {
  invitation?: Invitation | null;
  onBack: () => void;
  onSave: (invitation: Invitation, rawData?: any) => void;
}

export function InvitationEditForm({ invitation, onBack, onSave }: InvitationEditFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schema = React.useMemo(() => z.object({
    eventId: z.string().min(1, { message: t('chooseEvent') }),
    logic: z.enum(['strict', 'default_accept', 'view_only']),
    deadlineDate: z.string().min(1, { message: t('pleaseSelectDeadline') }),
    deadlineTime: z.string().min(1, { message: t('pleaseSelectDeadlineTime') }),
  }), [t]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Initialize React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      eventId: invitation?.eventId || '',
      logic: 'strict',
      deadlineDate: '',
      deadlineTime: '',
    },
  });

  // Watch deadlineDate value to display it and feed the calendar
  const deadlineDateValue = form.watch('deadlineDate');
  const selectedEventId = form.watch('eventId');
  const selectedEvent = events.find(ev => String(ev.id) === selectedEventId);
  const eventDate = selectedEvent?.event_date;

  // Close datepicker when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

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

  const selectedDate = deadlineDateValue ? new Date(deadlineDateValue) : undefined;

  // Fetch events list for dropdown
  useEffect(() => {
    if (!token) return;
    setEventsLoading(true);
    getEvents(token, { per_page: 100 })
      .then(res => setEvents(res.data.items))
      .catch(err => toast.error((err as Error).message || 'فشل تحميل قائمة الحفلات'))
      .finally(() => setEventsLoading(false));
  }, [token]);

  // Parse Jun 20, 2026 into YYYY-MM-DD
  const parseApiDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return '';
    }
  };

  // Fetch full details if editing
  useEffect(() => {
    if (!token || !invitation?.id) return;
    setDetailLoading(true);
    getInvitationById(Number(invitation.id), token)
      .then(res => {
        const details = res.data.details;
        form.reset({
          eventId: String(res.data.event_id),
          logic: details.logic_type === 'strict_action' ? 'strict' : details.logic_type,
          deadlineDate: parseApiDate(details.deadline_date),
          deadlineTime: details.deadline_time || '',
        });
      })
      .catch(err => toast.error((err as Error).message || 'فشل تحميل تفاصيل الدعوة'))
      .finally(() => setDetailLoading(false));
  }, [token, invitation?.id]);

  const onSubmit = async (values: FormValues) => {
    if (submitting) return;

    if (!invitation && !selectedFile) {
      setFileError(dir === 'ltr' ? 'Please upload a design file' : 'يرجى رفع ملف التصميم');
      return;
    }
    setFileError(null);

    const mappedLogic = values.logic === 'strict' ? 'strict_action' : values.logic;
    const selectedEvent = events.find(ev => String(ev.id) === values.eventId);

    setSubmitting(true);
    const formToast = toast.loading(invitation ? t('savingChanges') : t('creatingInvitation'));

    try {
      if (invitation) {
        // Update Invitation
        const res = await updateInvitation(
          Number(invitation.id),
          {
            event_id: values.eventId,
            logic_type: mappedLogic,
            deadline_date: values.deadlineDate,
            deadline_time: values.deadlineTime,
            image: selectedFile,
          },
          token
        );
        toast.dismiss(formToast);
        toast.success(res.msg || 'تم تحديث الدعوة بنجاح');

        onSave({
          id: invitation.id,
          eventId: values.eventId,
          eventName: selectedEvent?.name || invitation.eventName,
          deadlineDate: values.deadlineDate,
          guestsNumber: res.data?.guest_count ?? invitation.guestsNumber,
          status: res.data?.status === 'previous' ? 'past' : (res.data?.is_sent ? 'sent' : 'unsent'),
        }, res.data);
      } else {
        // Create Invitation
        const res = await createInvitation(
          {
            event_id: values.eventId,
            logic_type: mappedLogic,
            deadline_date: values.deadlineDate,
            deadline_time: values.deadlineTime,
            design: selectedFile,
          },
          token
        );
        toast.dismiss(formToast);
        toast.success(res.msg || 'تم إنشاء الدعوة بنجاح');

        onSave({
          id: String(res.data.id),
          eventId: values.eventId,
          eventName: selectedEvent?.name || res.data.name || 'Unnamed Event',
          deadlineDate: values.deadlineDate,
          guestsNumber: 0,
          status: 'unsent',
        }, res.data);
      }
    } catch (err) {
      toast.dismiss(formToast);
      toast.error((err as Error).message || 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setFileError(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setFileError(null);
    }
  };

  if (detailLoading) {
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
          {dir === 'ltr' ? (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
          <span className="font-medium">{t('back' as any) || (dir === 'ltr' ? 'Back' : 'الرجوع')}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {invitation ? (t('editInvitation' as any) || (dir === 'ltr' ? 'Edit Invitation' : 'تعديل الدعوة')) : (t('createInvitation' as any) || (dir === 'ltr' ? 'Create Invitation' : 'إنشاء دعوة'))}
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Event dropdown */}
            <FormField
              control={form.control}
              name="eventId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2 cursor-pointer">
                    <Ticket className="w-4 h-4 text-secondary/50" />
                    {t('selectEvent' as any) || (dir === 'ltr' ? 'Select Event' : 'اختر الحفل')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <select
                        {...field}
                        className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none font-medium cursor-pointer"
                        disabled={eventsLoading}
                      >
                        <option value="" disabled>
                          {eventsLoading
                            ? (dir === 'ltr' ? 'Loading events...' : 'جاري تحميل الحفلات...')
                            : (t('chooseEvent' as any) || (dir === 'ltr' ? 'Choose an event...' : 'اختر حفلاً...'))}
                        </option>
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.name}</option>
                        ))}
                      </select>
                    </FormControl>
                    <div className="absolute inset-y-0 end-4 flex items-center pointer-events-none text-secondary/40">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Logic type */}
            <FormField
              control={form.control}
              name="logic"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="block text-sm font-medium text-secondary/80 ml-1">
                    {t('invitationLogic' as any) || (dir === 'ltr' ? 'Invitation Logic' : 'منطق الدعوة')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      <label className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", field.value === 'strict' ? 'border-primary/50 bg-primary/5' : 'border-secondary/20 bg-white/50 hover:bg-white/80')}>
                        <input
                          type="radio"
                          value="strict"
                          checked={field.value === 'strict'}
                          onChange={() => field.onChange('strict')}
                          className="mt-1 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                        />
                        <div>
                          <span className="block text-sm font-medium text-secondary">{t('strictAction' as any) || (dir === 'ltr' ? 'Strict Action' : 'إجراء صارم')}</span>
                          <span className="block text-xs text-secondary/60 mt-0.5">{t('strictActionDesc' as any) || (dir === 'ltr' ? 'If no response, recorded as declined.' : 'إذا لم يتم الرد، تسجل كمرفوضة.')}</span>
                        </div>
                      </label>

                      <label className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", field.value === 'default_accept' ? 'border-primary/50 bg-primary/5' : 'border-secondary/20 bg-white/50 hover:bg-white/80')}>
                        <input
                          type="radio"
                          value="default_accept"
                          checked={field.value === 'default_accept'}
                          onChange={() => field.onChange('default_accept')}
                          className="mt-1 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                        />
                        <div>
                          <span className="block text-sm font-medium text-secondary">{t('defaultAccept' as any) || (dir === 'ltr' ? 'Default Accept' : 'قبول تلقائي')}</span>
                          <span className="block text-xs text-secondary/60 mt-0.5">{t('defaultAcceptDesc' as any) || (dir === 'ltr' ? 'If no response, recorded as accepted.' : 'إذا لم يتم الرد، تسجل كمقبولة.')}</span>
                        </div>
                      </label>

                      <label className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", field.value === 'view_only' ? 'border-primary/50 bg-primary/5' : 'border-secondary/20 bg-white/50 hover:bg-white/80')}>
                        <input
                          type="radio"
                          value="view_only"
                          checked={field.value === 'view_only'}
                          onChange={() => field.onChange('view_only')}
                          className="mt-1 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                        />
                        <div>
                          <span className="block text-sm font-medium text-secondary">{t('viewOnly' as any) || (dir === 'ltr' ? 'View Only' : 'للعرض فقط')}</span>
                          <span className="block text-xs text-secondary/60 mt-0.5">{t('viewOnlyDesc' as any) || (dir === 'ltr' ? 'Accepted right away, for informing only.' : 'تقبل فوراً، للعلم بالخبر فقط.')}</span>
                        </div>
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Deadline date + time fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Deadline Date */}
              <FormField
                control={form.control}
                name="deadlineDate"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-secondary/50" />
                      {t('deadline' as any) || (dir === 'ltr' ? 'Deadline' : 'الموعد النهائي')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative" ref={datePickerRef}>
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(!showDatePicker)}
                          className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 text-start text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all flex justify-between items-center cursor-pointer font-medium text-sm h-[46px] sm:h-[50px]"
                        >
                          <span>{field.value || (dir === 'ltr' ? 'Select deadline date...' : 'اختر تاريخ الموعد النهائي...')}</span>
                          <Calendar className="w-4 h-4 text-secondary/50 shrink-0" />
                        </button>

                        {showDatePicker && (
                          <div className="absolute z-[60] mt-2 p-3 bg-white border border-secondary/15 rounded-2xl shadow-xl left-0 rtl:right-0">
                            <DayPicker
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (!date) return;
                                const yyyy = date.getFullYear();
                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                const dd = String(date.getDate()).padStart(2, '0');
                                field.onChange(`${yyyy}-${mm}-${dd}`);
                                setShowDatePicker(false);
                              }}
                              disabled={getDisabledDays()}
                              locale={dir === 'rtl' ? ar : undefined}
                              dir={dir}
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Deadline Time */}
              <FormField
                control={form.control}
                name="deadlineTime"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-secondary/50" />
                      {t('deadlineTime' as any) || (dir === 'ltr' ? 'Time' : 'الوقت')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary cursor-pointer"
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

            {/* Design Upload */}
            <div>
              <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1">
                {t('uploadDesign' as any) || (dir === 'ltr' ? 'Upload Design' : 'رفع التصميم')} {!invitation && <span className="text-red-500">*</span>}
              </label>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/30",
                  fileError
                    ? "border-red-500 bg-red-50/20 hover:bg-red-50/30"
                    : "border-secondary/20 hover:bg-white/50 hover:border-primary/30"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                />
                <Upload className="w-8 h-8 text-secondary/40 mb-3" />
                <p className="text-sm font-medium text-secondary mb-1">
                  {fileName ? fileName : (t('uploadDesign' as any) || (dir === 'ltr' ? 'Upload Design' : 'رفع التصميم'))}
                </p>
                <p className="text-xs text-secondary/50">
                  {t('uploadDesignDesc' as any) || (dir === 'ltr' ? 'PNG, JPG, WEBP up to 10MB' : 'أقصى حجم 10 ميجابايت (PNG, JPG, WEBP)')}
                </p>
              </div>
              {fileError && (
                <p className="text-xs text-red-500 mt-1.5 ml-1">{fileError}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-secondary/10 mt-8 w-full">
              <button
                type="button"
                onClick={onBack}
                disabled={submitting}
                className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-secondary/20 bg-white/50 text-secondary hover:bg-white/80 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('cancel' as any) || (dir === 'ltr' ? 'Cancel' : 'إلغاء')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:flex-1 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {dir === 'ltr' ? 'Saving...' : 'جاري الحفظ...'}
                  </>
                ) : (
                  invitation ? (t('saveChanges' as any) || (dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات')) : (t('createInvitation' as any) || (dir === 'ltr' ? 'Create Invitation' : 'إنشاء دعوة'))
                )}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}
