import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Shield, Edit2, Trash2, 
  User, Phone, KeyRound, Copy, Calendar, 
  QrCode, CheckCircle2, X, Loader2, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { AssignEventsModal } from './AssignEventsModal';
import { AttendanceDetails } from '../invitations/InvitationDetails';
import { getEmployeeById, assignEmployeeEvents } from '@/lib/api';
import type { ApiEmployeeDetail } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

export function EmployeeDetails({ 
  employee, 
  onBack, 
  onEdit, 
  onDelete, 
  onUpdate, 
  onNavigateToEvent 
}: { 
  employee: any, 
  onBack: () => void, 
  onEdit: () => void, 
  onDelete: () => void, 
  onUpdate: () => void, 
  onNavigateToEvent?: (id: string) => void 
}) {
  const { t, dir, language } = useLanguage();
  const token = getToken() ?? '';

  const [detail, setDetail] = useState<ApiEmployeeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAttendanceForEvent, setShowAttendanceForEvent] = useState<any | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!token || !employee.id) return;
    setDetailLoading(true);
    try {
      const res = await getEmployeeById(employee.id, token);
      setDetail(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل تفاصيل الموظف');
    } finally {
      setDetailLoading(false);
    }
  }, [token, employee.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const assignedEventIds = useMemo(() => {
    if (!detail) return [];
    const upcoming = detail.assigned_events?.upcoming || detail.upcomingEvents || [];
    const past = detail.assigned_events?.past || detail.pastEvents || [];
    return [...upcoming, ...past].map(e => String(e.id));
  }, [detail]);

  const upcomingEventsList = useMemo(() => {
    return detail?.assigned_events?.upcoming || detail?.upcomingEvents || [];
  }, [detail]);

  const pastEventsList = useMemo(() => {
    return detail?.assigned_events?.past || detail?.pastEvents || [];
  }, [detail]);

  const displayedEventsList = activeEventTab === 'upcoming' ? upcomingEventsList : pastEventsList;

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setToastMessage(`${type} copied to clipboard!`);
  };

  const handleUnassign = async (eventId: number) => {
    if (!token || !detail) return;
    const saveToast = toast.loading(language === 'ar' ? 'جاري إلغاء التعيين...' : 'Unassigning event...');
    try {
      const updatedIds = assignedEventIds.map(Number).filter(id => id !== eventId);
      await assignEmployeeEvents(detail.id, updatedIds, token);
      toast.success(t('unassignEventSuccess' as any) || 'Event unassigned successfully');
      fetchDetail();
      onUpdate(); // refresh listing page
    } catch (err) {
      toast.error((err as Error).message || 'فشل إلغاء تعيين المناسبة');
    } finally {
      toast.dismiss(saveToast);
    }
  };

  const handleAssignSubmit = async (selectedIds: number[]) => {
    if (!token || !detail) return;
    const saveToast = toast.loading(language === 'ar' ? 'جاري تعيين المناسبات...' : 'Assigning events...');
    try {
      await assignEmployeeEvents(detail.id, selectedIds, token);
      toast.success(language === 'ar' ? 'تم تعيين المناسبات بنجاح' : 'Events assigned successfully');
      fetchDetail();
      onUpdate(); // refresh listing page
    } catch (err) {
      toast.error((err as Error).message || 'فشل تعيين المناسبات للموظف');
    } finally {
      toast.dismiss(saveToast);
    }
  };

  if (showAttendanceForEvent) {
    return (
      <AttendanceDetails
        onBack={() => setShowAttendanceForEvent(null)}
        attendanceNumber={Math.floor(showAttendanceForEvent.guests || 0 * 0.85)}
        employeeName={employee.name}
      />
    );
  }

  return (
    <div className="space-y-6 pb-10 relative">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 bg-secondary text-white px-4 py-3 rounded-2xl shadow-xl shadow-secondary/20 w-80"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-medium flex-1 truncate">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)}
              className="ml-2 p-1 hover:bg-white/10 rounded-full transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 sm:p-2.5 bg-white text-secondary/60 hover:text-secondary rounded-xl transition-all shadow-sm ring-1 ring-black/5 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
          >
            {dir === 'ltr' ? <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> : <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          <div className="flex items-center gap-3 text-start">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className={cn("text-2xl font-medium text-secondary flex items-center gap-2", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {employee.name}
              </h2>
              <span className="text-sm text-secondary/60 font-mono">{employee.reference_label}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <button 
            title={t('edit' as any) || 'Edit'}
            onClick={onEdit}
            className="w-10 h-10 bg-white text-yellow-500 rounded-xl transition-all shadow-sm ring-1 ring-black/5 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer hover:bg-yellow-50 font-medium"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            title={t('remove' as any) || 'Remove'}
            onClick={onDelete}
            className="w-10 h-10 bg-white text-red-500 rounded-xl transition-all shadow-sm ring-1 ring-black/5 hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer hover:bg-red-50 font-medium"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {detailLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : detail ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-6 md:col-span-1">
            <div className="glass-panel p-6 rounded-3xl space-y-5 text-start">
              <h3 className="font-semibold text-secondary flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                {language === 'ar' ? 'تفاصيل الموظف' : 'Employee Details'}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/5">
                  <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-secondary/60" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-secondary/60">{t('phone' as any) || 'Phone'}</span>
                    <span className="text-sm font-semibold text-secondary" dir="ltr">{detail.full_phone}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/5 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-secondary/60" />
                    </div>
                    <div className="flex flex-col text-start">
                      <span className="text-xs font-medium text-secondary/60">{t('username' as any) || 'Username'}</span>
                      <span className="text-sm font-semibold text-secondary">@{detail.username}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCopy(detail.username, t('username' as any) || 'Username')}
                    className="p-2 text-secondary/40 hover:text-primary hover:bg-primary/5 rounded-xl transition-all cursor-pointer"
                    title="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/5 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center shrink-0">
                      <KeyRound className="w-5 h-5 text-secondary/60" />
                    </div>
                    <div className="flex flex-col text-start">
                      <span className="text-xs font-medium text-secondary/60">{t('password' as any) || 'Password'}</span>
                      <span className="text-sm font-semibold text-secondary">••••••••</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-3xl">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="font-semibold text-secondary flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {t('eventsResponsible' as any) || 'Events Responsible'}
                    <span className="text-xs bg-secondary/10 px-2 py-0.5 rounded-full text-secondary/70">
                      {upcomingEventsList.length + pastEventsList.length}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2 bg-secondary/5 rounded-full p-1 border border-secondary/10 w-fit self-start sm:self-auto">
                    <button
                      onClick={() => setActiveEventTab('upcoming')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer",
                        activeEventTab === 'upcoming' ? "bg-white text-primary shadow-sm ring-1 ring-black/5" : "text-secondary/60 hover:text-secondary"
                      )}
                    >
                      {t('upcomingEvents' as any) || 'Upcoming'}
                      <span className="ml-1.5 text-[10px] opacity-70">({upcomingEventsList.length})</span>
                    </button>
                    <button
                      onClick={() => setActiveEventTab('past')}
                      className={cn(
                        "px-3 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer",
                        activeEventTab === 'past' ? "bg-white text-primary shadow-sm ring-1 ring-black/5" : "text-secondary/60 hover:text-secondary"
                      )}
                    >
                      {t('pastEvents' as any) || 'Past'}
                      <span className="ml-1.5 text-[10px] opacity-70">({pastEventsList.length})</span>
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="w-full px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  {language === 'ar' ? 'تعيين مناسبات' : 'Assign Events'}
                </button>
              </div>

              {displayedEventsList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <Calendar className="w-12 h-12 text-secondary/20 mb-3" />
                  <p className="text-secondary/60">{language === 'ar' ? 'لا توجد مناسبات معينة لهذا الموظف.' : `No ${activeEventTab} events assigned to this employee.`}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {displayedEventsList.map(event => (
                    <div 
                      key={event.id} 
                      onClick={() => onNavigateToEvent && onNavigateToEvent(String(event.id))}
                      className="p-4 rounded-2xl bg-white/40 border border-secondary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 hover:border-secondary/10 transition-all text-start"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-medium text-secondary truncate">{event.name}</h4>
                          <div className="flex flex-wrap items-center text-xs text-secondary/60 gap-1.5 mt-1">
                            <span>{event.event_date}</span>
                            <span className="w-1 h-1 rounded-full bg-secondary/20" />
                            <span className="font-mono">{event.reference_label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-auto shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleUnassign(event.id)}
                          className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title={t('unassignEvent' as any) || 'Unassign'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-secondary/40 text-center">
          <AlertCircle className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">{language === 'ar' ? 'فشل تحميل البيانات.' : 'Error loading details.'}</p>
        </div>
      )}

      {isAssignModalOpen && (
        <AssignEventsModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          assignedEventIds={assignedEventIds}
          currentEmployeeId={employee.id}
          onAssign={handleAssignSubmit}
        />
      )}
    </div>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
  );
}
