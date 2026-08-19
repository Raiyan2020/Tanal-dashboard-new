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
import {
  getAdminServiceOrderById,
  getInvitationById,
  updateInvitation,
  type ApiServiceOrderDetail,
} from '@/lib/api';
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

/** `"18:00"` → minutes since midnight, or null when unparseable. */
function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * `service_order_id` is intentionally absent — an invitation belongs to the
 * order that created it and cannot be reassigned. Guests and send-status are
 * managed from their own endpoints.
 */
interface FormValues {
  logic: 'strict' | 'default_accept' | 'view_only';
  deadlineDate: string;
  deadlineTime: string;
}

/**
 * Edit-only. Invitations are created by the backend as part of a service order
 * that includes the barcode/QR system service — there is no create path here.
 */
interface InvitationEditFormProps {
  invitation: Invitation;
  onBack: () => void;
  onSave: (invitation: Invitation, rawData?: any) => void;
}

export function InvitationEditForm({ invitation, onBack, onSave }: InvitationEditFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schema = React.useMemo(() => z.object({
    logic: z.enum(['strict', 'default_accept', 'view_only']),
    deadlineDate: z.string().min(1, { message: t('pleaseSelectDeadline') }),
    deadlineTime: z.string().min(1, { message: t('pleaseSelectDeadlineTime') }),
  }), [t]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);

  // The order this invitation belongs to — read-only, but its event start is
  // the ceiling for the deadline.
  const [order, setOrder] = useState<ApiServiceOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  /** From `actions.can_be_edited` — false once the invitation has been sent. */
  const [canEdit, setCanEdit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Initialize React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      logic: 'strict',
      deadlineDate: '',
      deadlineTime: '',
    },
  });

  // Watch deadlineDate value to display it and feed the calendar
  const deadlineDateValue = form.watch('deadlineDate');
  const eventDate = order?.event_date ?? undefined;
  const eventStartMinutes = order?.event_time ? toMinutes(order.event_time) : null;

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

  // Load the invitation, then the order it belongs to (for the deadline ceiling).
  useEffect(() => {
    if (!token || !invitation.id) return;
    setDetailLoading(true);
    getInvitationById(Number(invitation.id), token)
      .then(async res => {
        const details = res.data.details;
        setCanEdit(res.data.actions?.can_be_edited !== false);
        form.reset({
          // `logic_type` is null on invitations whose order never set one — leave
          // the field untouched then so the form keeps its own default.
          logic: details.logic_type === 'strict_action' ? 'strict' : details.logic_type ?? undefined,
          deadlineDate: parseApiDate(details.deadline_date),
          deadlineTime: details.deadline_time || '',
        });
        if (res.data.service_order_id != null) {
          try {
            const orderRes = await getAdminServiceOrderById(res.data.service_order_id, token);
            setOrder(orderRes.data);
          } catch {
            // Non-fatal: the deadline ceiling falls back to the server's own check.
          }
        }
      })
      .catch(err => toast.error((err as Error).message || 'فشل تحميل تفاصيل الدعوة'))
      .finally(() => setDetailLoading(false));
  }, [token, invitation.id]);

  const onSubmit = async (values: FormValues) => {
    if (submitting || !canEdit) return;
    setFileError(null);

    // The deadline must fall before the event actually starts — the day-level
    // check in the picker cannot catch a same-day deadline set after start.
    if (order?.event_date && eventStartMinutes != null) {
      const eventDay = parseApiDate(order.event_date);
      const deadlineMinutes = toMinutes(values.deadlineTime);
      if (
        eventDay && values.deadlineDate === eventDay
        && deadlineMinutes != null && deadlineMinutes >= eventStartMinutes
      ) {
        form.setError('deadlineTime', {
          message: dir === 'ltr'
            ? 'The deadline must be before the event starts'
            : 'يجب أن يكون الموعد النهائي قبل بداية المناسبة',
        });
        return;
      }
    }

    const mappedLogic = values.logic === 'strict' ? 'strict_action' : values.logic;

    setSubmitting(true);
    const formToast = toast.loading(t('savingChanges'));

    try {
      const res = await updateInvitation(
        Number(invitation.id),
        {
          logic_type: mappedLogic,
          deadline_date: values.deadlineDate,
          deadline_time: values.deadlineTime,
          design: selectedFile,
        },
        token
      );
      toast.dismiss(formToast);
      toast.success(res.msg || 'تم تحديث الدعوة بنجاح');

      onSave({
        ...invitation,
        id: invitation.id,
        serviceOrderReference: order?.reference_label || invitation.serviceOrderReference,
        clientName: order?.client?.name ?? invitation.clientName,
        executionDate: order?.event_date ?? invitation.executionDate,
        deadlineDate: values.deadlineDate,
        guestsNumber: res.data?.guest_count ?? invitation.guestsNumber,
        isBarcodeSuspended: order?.is_barcode_suspended ?? invitation.isBarcodeSuspended,
        status: res.data?.status === 'previous' ? 'past' : (res.data?.is_sent ? 'sent' : 'unsent'),
      }, res.data);
    } catch (err) {
      toast.dismiss(formToast);
      toast.error((err as Error).message || 'حدث خطأ غير متوقع');
    } finally {
      setSubmitting(false);
    }
  };

  const MAX_DESIGN_BYTES = 10 * 1024 * 1024;

  /** Mirrors the backend's `image/*` + 10MB rule so a bad file fails locally. */
  const acceptFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFileError(dir === 'ltr' ? 'The design must be an image' : 'يجب أن يكون التصميم صورة');
      return;
    }
    if (file.size > MAX_DESIGN_BYTES) {
      setFileError(dir === 'ltr' ? 'Maximum size is 10MB' : 'أقصى حجم 10 ميجابايت');
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setFileError(null);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) acceptFile(file);
  };

  if (detailLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // A sent invitation is frozen server-side — showing the form would only lead
  // to a 422 after the admin has retyped everything.
  if (!canEdit) {
    return (
      <div className="space-y-6 pb-10 w-full text-start">
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

        <div className="glass-panel p-8 rounded-[2rem] border border-secondary/5 w-full max-w-3xl mx-auto flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Ticket className="w-7 h-7" />
          </div>
          <div>
            <p className="text-base font-medium text-secondary">
              {dir === 'ltr' ? 'This invitation can no longer be edited' : 'لا يمكن تعديل هذه الدعوة'}
            </p>
            <p className="text-sm text-secondary/60 mt-1">
              {dir === 'ltr'
                ? 'It has already been sent to the guests.'
                : 'تم إرسالها بالفعل إلى الضيوف.'}
            </p>
          </div>
        </div>
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
          {t('editInvitation' as any) || (dir === 'ltr' ? 'Edit Invitation' : 'تعديل الدعوة')}
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* Linked service order — fixed for the life of the invitation */}
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
                <Ticket className="w-4 h-4 text-secondary/50" />
                {dir === 'ltr' ? 'Service Order' : 'طلب الخدمة'}
              </span>
              <div className="w-full bg-secondary/5 border border-secondary/10 rounded-xl px-4 py-3 text-secondary font-medium">
                {order?.reference_label || invitation.serviceOrderReference || '—'}
                {order?.client?.name ? ` — ${order.client.name}` : ''}
                {order?.event_date ? ` (${order.event_date})` : ''}
              </div>
              <p className="text-xs text-secondary/50 ml-1">
                {dir === 'ltr'
                  ? 'An invitation stays with the order that created it.'
                  : 'ترتبط الدعوة بالطلب الذي أنشأها ولا يمكن نقلها.'}
              </p>
            </div>

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
                {t('uploadDesign' as any) || (dir === 'ltr' ? 'Upload Design' : 'رفع التصميم')}
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
                  t('saveChanges' as any) || (dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات')
                )}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </motion.div>
  );
}
