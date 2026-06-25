import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/lib/i18n';
import { X, Calendar, Search, User, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEmployeeAssignableEvents } from '@/lib/api';
import type { ApiAssignableEvent } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

interface AssignEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedEventIds: string[];
  currentEmployeeId: number;
  onAssign: (selectedIds: number[]) => void;
}

export function AssignEventsModal({ 
  isOpen, 
  onClose, 
  assignedEventIds, 
  currentEmployeeId, 
  onAssign 
}: AssignEventsModalProps) {
  const { t, dir, language } = useLanguage();
  const token = getToken() ?? '';

  const [events, setEvents] = useState<ApiAssignableEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [warningEventId, setWarningEventId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(assignedEventIds.map(Number)));
      setSearchTerm('');
      setWarningEventId(null);
      
      const fetchEvents = async () => {
        setLoading(true);
        try {
          const res = await getEmployeeAssignableEvents(currentEmployeeId, token);
          setEvents(res.data.items);
          
          // Also pre-select any options that are returned as is_assigned === true
          const backendAssigned = res.data.items
            .filter(item => item.is_assigned)
            .map(item => item.id);
          
          setSelectedIds(prev => {
            const next = new Set(prev);
            backendAssigned.forEach(id => next.add(id));
            return next;
          });
        } catch (err) {
          toast.error((err as Error).message || 'فشل تحميل المناسبات المتاحة');
        } finally {
          setLoading(false);
        }
      };

      fetchEvents();
    }
  }, [isOpen, assignedEventIds, currentEmployeeId, token]);

  const filteredEvents = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return events.filter(event => 
      event.name.toLowerCase().includes(term) ||
      event.reference_label.toLowerCase().includes(term) ||
      String(event.id).includes(term)
    );
  }, [events, searchTerm]);

  const toggleEvent = (id: number) => {
    const event = events.find(e => e.id === id);
    const newSelected = new Set(selectedIds);
    
    // Warn if selecting an event currently assigned to other employees
    if (!newSelected.has(id) && event?.other_staff && event.other_staff.length > 0) {
      setWarningEventId(id);
      return;
    }

    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const confirmAssignment = () => {
    if (warningEventId !== null) {
      const newSelected = new Set(selectedIds);
      newSelected.add(warningEventId);
      setSelectedIds(newSelected);
      setWarningEventId(null);
    }
  };

  const handleSave = () => {
    onAssign(Array.from(selectedIds));
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 text-secondary">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-secondary/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0 }}
            className="w-full max-w-lg glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-start"
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/20 shrink-0">
              <h2 className={cn("text-xl font-medium text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {language === 'ar' ? 'تعيين المناسبات' : 'Assign Events'}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 bg-white/40 hover:bg-white/60 transition-colors rounded-full"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>

            <div className="p-6 pb-4 shrink-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-3 pointer-events-none text-secondary/40">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder={language === 'ar' ? 'ابحث عن مناسبة...' : 'Search events...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 pl-10 pr-4 rtl:pr-10 rtl:pl-4 transition-all outline-none text-secondary text-sm"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex-1 overflow-y-auto space-y-2 relative min-h-[150px]">
              {loading && (
                <div className="absolute inset-0 bg-white/45 backdrop-blur-[1px] flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {filteredEvents.length > 0 ? (
                filteredEvents.map(event => {
                  const isSelected = selectedIds.has(event.id);
                  return (
                    <div 
                      key={event.id}
                      onClick={() => toggleEvent(event.id)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group",
                        isSelected ? "bg-primary/5 border-primary/20 selected-shadow" : "bg-white/40 border-secondary/5 hover:bg-white/60 hover:border-secondary/10"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary/20 text-primary" : "bg-black/5 text-secondary/60 group-hover:text-secondary/80"
                        )}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-semibold text-secondary text-sm truncate">{event.name}</span>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-xs text-secondary/60 font-mono">{event.reference_label} • {event.event_date}</span>
                            {event.other_staff && event.other_staff.length > 0 && (
                              <span className="text-xs font-medium px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-md border border-yellow-200/50 flex items-center gap-1 w-fit">
                                <User className="w-3 h-3" />
                                {event.other_staff.map(s => s.name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        isSelected ? "bg-primary border-primary text-white" : "border-secondary/20 group-hover:border-secondary/40"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                !loading && (
                  <div className="text-center py-8 text-secondary/60 text-sm">
                    {language === 'ar' ? 'لم يتم العثور على مناسبات.' : 'No events found.'}
                  </div>
                )
              )}
            </div>

            <div className="p-6 pt-0 shrink-0">
              <button
                onClick={handleSave}
                className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3 font-medium transition-colors shadow-md shadow-primary/20 cursor-pointer"
              >
                {t('save' as any) || 'Save'} ({selectedIds.size})
              </button>
            </div>
          </motion.div>

          {/* Warning Modal */}
          <AnimatePresence>
            {warningEventId !== null && (
              <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setWarningEventId(null)}
                  className="absolute inset-0 bg-secondary/60 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white rounded-3xl p-6 relative z-10 w-full max-w-sm shadow-2xl text-start"
                >
                  <h3 className="text-lg font-semibold text-secondary mb-2">
                    {language === 'ar' ? 'المناسبة معينة لموظف آخر بالفعل' : 'Event Already Assigned'}
                  </h3>
                  <p className="text-secondary/70 text-sm mb-6 text-start">
                    {language === 'ar' 
                      ? 'هذه المناسبة لديها موظفون معينون بالفعل. هل تريد تعيين هذا الموظف معهم أيضاً؟' 
                      : 'This event already has assigned employees. Do you want to assign this employee to it as well?'}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setWarningEventId(null)}
                      className="flex-1 py-2 rounded-xl text-secondary/70 bg-secondary/5 hover:bg-secondary/10 font-medium transition-colors cursor-pointer"
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      onClick={confirmAssignment}
                      className="flex-1 py-2 rounded-xl text-white bg-primary hover:bg-primary-dark font-medium transition-colors cursor-pointer"
                    >
                      {language === 'ar' ? 'تعيين' : 'Assign'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
