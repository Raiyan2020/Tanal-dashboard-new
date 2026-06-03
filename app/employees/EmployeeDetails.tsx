import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, ArrowRight, Shield, Edit2, Trash2, 
  User, Phone, KeyRound, Copy, Calendar, 
  QrCode, CheckCircle2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { AssignEventsModal } from './AssignEventsModal';
import { AttendanceDetails } from '../invitations/InvitationDetails';

const MOCK_EVENTS = [
  { id: '1001', name: 'Al Saud Royal Wedding', creationDate: 'Oct 24, 2026', guests: 850 },
  { id: '1002', name: 'Al Rajhi Ceremony', creationDate: 'Nov 12, 2026', guests: 420 },
  { id: '1003', name: 'Al Olayan Reception', creationDate: 'Dec 05, 2026', guests: 1200 },
  { id: '1004', name: 'Al Jasser Wedding', creationDate: 'Jan 15, 2027', guests: 300 },
  { id: '1005', name: 'Ahmad Wedding', creationDate: 'Aug 20, 2025', guests: 50 },
];

export function EmployeeDetails({ employee, onBack, onEdit, onDelete, onUpdate, onNavigateToEvent }: { employee: any, onBack: () => void, onEdit: () => void, onDelete: () => void, onUpdate: (data: any) => void, onNavigateToEvent?: (id: string) => void }) {
  const { t, dir } = useLanguage();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAttendanceForEvent, setShowAttendanceForEvent] = useState<any | null>(null);
  const [activeEventTab, setActiveEventTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const assignedEventIds = employee.assignedEvents || [];
  const allAssignedEvents = assignedEventIds.map((id: string) => MOCK_EVENTS.find(e => e.id === id)).filter(Boolean) as typeof MOCK_EVENTS;
  
  // Logic to separate past and upcoming. For mock purposes:
  const upcomingEventsList = allAssignedEvents.filter(e => !e.id.endsWith('5'));
  const pastEventsList = allAssignedEvents.filter(e => e.id.endsWith('5'));
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

  if (showAttendanceForEvent) {
    return (
      <AttendanceDetails
        onBack={() => setShowAttendanceForEvent(null)}
        attendanceNumber={Math.floor(showAttendanceForEvent.guests * 0.85)}
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className={cn("text-2xl font-medium text-secondary flex items-center gap-2", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {employee.name}
              </h2>
              <span className="text-sm text-secondary/60 font-mono">#{employee.id}</span>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6 md:col-span-1">
          <div className="glass-panel p-6 rounded-3xl space-y-5">
            <h3 className="font-semibold text-secondary flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Employee Details
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/5">
                <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-secondary/60" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-secondary/60">{t('phone' as any) || 'Phone'}</span>
                  <span className="text-sm font-semibold text-secondary" dir="ltr">{employee.phone}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/5 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-secondary/60" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-secondary/60">{t('username' as any) || 'Username'}</span>
                    <span className="text-sm font-semibold text-secondary">{employee.username}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(employee.username, t('username' as any) || 'Username')}
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
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-secondary/60">{t('password' as any) || 'Password'}</span>
                    <span className="text-sm font-semibold text-secondary">{employee.password}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(employee.password, t('password' as any) || 'Password')}
                  className="p-2 text-secondary/40 hover:text-primary hover:bg-primary/5 rounded-xl transition-all cursor-pointer"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
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
                    {allAssignedEvents.length}
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
                className="w-full px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-primary/20 flex items-center justify-center cursor-pointer"
              >
                Assign Events
              </button>
            </div>

            {displayedEventsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Calendar className="w-12 h-12 text-secondary/20 mb-3" />
                <p className="text-secondary/60">No {activeEventTab} events assigned to this employee.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {displayedEventsList.map(event => (
                  <div 
                    key={event.id} 
                    onClick={() => onNavigateToEvent && onNavigateToEvent(event.id)}
                    className="p-4 rounded-2xl bg-white/40 border border-secondary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 hover:border-secondary/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h4 className="font-medium text-secondary truncate">{event.name}</h4>
                        <div className="flex flex-wrap items-center text-xs text-secondary/60 gap-1.5 mt-1">
                          <span>{event.creationDate}</span>
                          <span className="w-1 h-1 rounded-full bg-secondary/20" />
                          <span className="font-mono">#{event.id}</span>
                          {activeEventTab === 'past' && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-secondary/20" />
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <QrCode className="w-3.5 h-3.5" />
                                {Math.floor(event.guests * 0.85)} {t('scansMade' as any) || 'Scans Made'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 self-end sm:self-auto shrink-0">
                      {activeEventTab === 'past' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAttendanceForEvent(event);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                          title="QR Check-ins"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          {t('qrCheckIns' as any) || 'QR Check-ins'}
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onUpdate) {
                            const updatedEvents = assignedEventIds.filter((id: string) => id !== event.id);
                            onUpdate({ ...employee, assignedEvents: updatedEvents, eventsResponsible: updatedEvents.length });
                            setToastMessage(t('unassignEventSuccess' as any) || 'Event unassigned successfully');
                          }
                        }}
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

      <AssignEventsModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        assignedEventIds={assignedEventIds}
        currentEmployeeId={employee.id}
        onAssign={(selectedIds) => {
          if (onUpdate) {
            onUpdate({ ...employee, assignedEvents: selectedIds, eventsResponsible: selectedIds.length });
          }
        }}
      />
    </div>
  );
}
