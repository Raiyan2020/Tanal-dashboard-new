import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Upload, Ticket, Calendar, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { Invitation } from './page';
import { getEvents, getInvitationById, createInvitation, updateInvitation, type ApiEvent } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

interface InvitationEditFormProps {
  invitation?: Invitation | null;
  onBack: () => void;
  onSave: (invitation: Invitation, rawData?: any) => void;
}

export function InvitationEditForm({ invitation, onBack, onSave }: InvitationEditFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [eventId, setEventId] = useState(invitation?.eventId || '');
  const [logic, setLogic] = useState<'strict' | 'default_accept' | 'view_only'>('strict');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');

  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        setEventId(String(res.data.event_id));
        setLogic(details.logic_type === 'strict_action' ? 'strict' : details.logic_type);
        setDeadlineDate(parseApiDate(details.deadline_date));
        setDeadlineTime(details.deadline_time || '');
      })
      .catch(err => toast.error((err as Error).message || 'فشل تحميل تفاصيل الدعوة'))
      .finally(() => setDetailLoading(false));
  }, [token, invitation?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const mappedLogic = logic === 'strict' ? 'strict_action' : logic;
    const selectedEvent = events.find(ev => String(ev.id) === eventId);
    
    setSubmitting(true);
    const formToast = toast.loading(invitation ? 'Saving changes...' : 'Creating invitation...');
    
    try {
      if (invitation) {
        // Update Invitation
        const res = await updateInvitation(
          Number(invitation.id),
          {
            event_id: eventId,
            logic_type: mappedLogic,
            deadline_date: deadlineDate,
            deadline_time: deadlineTime,
            image: selectedFile,
          },
          token
        );
        toast.dismiss(formToast);
        toast.success(res.msg || 'تم تحديث الدعوة بنجاح');
        
        onSave({
          id: invitation.id,
          eventId: eventId,
          eventName: selectedEvent?.name || invitation.eventName,
          deadlineDate: deadlineDate,
          guestsNumber: res.data?.guest_count ?? invitation.guestsNumber,
          status: res.data?.status === 'previous' ? 'past' : (res.data?.is_sent ? 'sent' : 'unsent'),
        }, res.data);
      } else {
        // Create Invitation
        const res = await createInvitation(
          {
            event_id: eventId,
            logic_type: mappedLogic,
            deadline_date: deadlineDate,
            deadline_time: deadlineTime,
            design: selectedFile,
          },
          token
        );
        toast.dismiss(formToast);
        toast.success(res.msg || 'تم إنشاء الدعوة بنجاح');
        
        onSave({
          id: String(res.data.id),
          eventId: eventId,
          eventName: selectedEvent?.name || res.data.name || 'Unnamed Event',
          deadlineDate: deadlineDate,
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
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
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
      className="space-y-6 pb-10 w-full"
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
        <form onSubmit={handleSubmit} className="space-y-6">

          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 flex items-center gap-2 cursor-pointer">
              <Ticket className="w-4 h-4 text-secondary/50" />
              {t('selectEvent' as any) || (dir === 'ltr' ? 'Select Event' : 'اختر الحفل')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={eventId}
                onChange={e => setEventId(e.target.value)}
                className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none font-medium cursor-pointer"
                required
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
              <div className="absolute inset-y-0 end-4 flex items-center pointer-events-none text-secondary/40">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-2 ml-1">
              {t('invitationLogic' as any) || (dir === 'ltr' ? 'Invitation Logic' : 'منطق الدعوة')} <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <label className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", logic === 'strict' ? 'border-primary/50 bg-primary/5' : 'border-secondary/20 bg-white/50 hover:bg-white/80')}>
                <input
                  type="radio"
                  name="logic"
                  checked={logic === 'strict'}
                  onChange={() => setLogic('strict')}
                  className="mt-1 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                />
                <div>
                  <span className="block text-sm font-medium text-secondary">{t('strictAction' as any) || (dir === 'ltr' ? 'Strict Action' : 'إجراء صارم')}</span>
                  <span className="block text-xs text-secondary/60 mt-0.5">{t('strictActionDesc' as any) || (dir === 'ltr' ? 'If no response, recorded as declined.' : 'إذا لم يتم الرد، تسجل كمرفوضة.')}</span>
                </div>
              </label>

              <label className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", logic === 'default_accept' ? 'border-primary/50 bg-primary/5' : 'border-secondary/20 bg-white/50 hover:bg-white/80')}>
                <input
                  type="radio"
                  name="logic"
                  checked={logic === 'default_accept'}
                  onChange={() => setLogic('default_accept')}
                  className="mt-1 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                />
                <div>
                  <span className="block text-sm font-medium text-secondary">{t('defaultAccept' as any) || (dir === 'ltr' ? 'Default Accept' : 'قبول تلقائي')}</span>
                  <span className="block text-xs text-secondary/60 mt-0.5">{t('defaultAcceptDesc' as any) || (dir === 'ltr' ? 'If no response, recorded as accepted.' : 'إذا لم يتم الرد، تسجل كمقبولة.')}</span>
                </div>
              </label>

              <label className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", logic === 'view_only' ? 'border-primary/50 bg-primary/5' : 'border-secondary/20 bg-white/50 hover:bg-white/80')}>
                <input
                  type="radio"
                  name="logic"
                  checked={logic === 'view_only'}
                  onChange={() => setLogic('view_only')}
                  className="mt-1 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                />
                <div>
                  <span className="block text-sm font-medium text-secondary">{t('viewOnly' as any) || (dir === 'ltr' ? 'View Only' : 'للعرض فقط')}</span>
                  <span className="block text-xs text-secondary/60 mt-0.5">{t('viewOnlyDesc' as any) || (dir === 'ltr' ? 'Accepted right away, for informing only.' : 'تقبل فوراً، للعلم بالخبر فقط.')}</span>
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-secondary/50" />
                {t('deadline' as any) || (dir === 'ltr' ? 'Deadline' : 'الموعد النهائي')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={e => setDeadlineDate(e.target.value)}
                className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 flex items-center gap-2">
                <Clock className="w-4 h-4 text-secondary/50" />
                {t('deadlineTime' as any) || (dir === 'ltr' ? 'Time' : 'الوقت')} <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={deadlineTime}
                onChange={e => setDeadlineTime(e.target.value)}
                className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1">
              {t('uploadDesign' as any) || (dir === 'ltr' ? 'Upload Design' : 'رفع التصميم')}
            </label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-secondary/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/50 hover:border-primary/30 transition-all bg-white/30"
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
          </div>

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
      </div>
    </motion.div>
  );
}
