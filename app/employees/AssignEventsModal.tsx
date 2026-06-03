import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '@/lib/i18n';
import { X, Calendar, Search, User, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock properties to represent an event
interface AppEvent {
  id: string;
  name: string;
  date?: string;
  creationDate?: string;
  assignedEmployeeId?: number;
}

const MOCK_EVENTS: AppEvent[] = [
  { id: '1001', name: 'Al Saud Royal Wedding', creationDate: 'Oct 24, 2026', assignedEmployeeId: 1 },
  { id: '1002', name: 'Al Rajhi Ceremony', creationDate: 'Nov 12, 2026', assignedEmployeeId: 1 },
  { id: '1003', name: 'Al Olayan Reception', creationDate: 'Dec 05, 2026', assignedEmployeeId: 2 },
  { id: '1004', name: 'Al Jasser Wedding', creationDate: 'Jan 15, 2027', assignedEmployeeId: 1 },
];

const MOCK_EMPLOYEES = [
  { id: 1, name: 'Tarik Admin' },
  { id: 2, name: 'Laila Staff' },
];

interface AssignEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignedEventIds: string[];
  currentEmployeeId: number;
  onAssign: (selectedIds: string[]) => void;
}

export function AssignEventsModal({ isOpen, onClose, assignedEventIds, currentEmployeeId, onAssign }: AssignEventsModalProps) {
  const { t, dir } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [warningEventId, setWarningEventId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(assignedEventIds));
      setSearchTerm('');
      setWarningEventId(null);
    }
  }, [isOpen, assignedEventIds]);

  const filteredEvents = MOCK_EVENTS.filter(event => 
    event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEvent = (id: string) => {
    const event = MOCK_EVENTS.find(e => e.id === id);
    const newSelected = new Set(selectedIds);
    
    if (!newSelected.has(id) && event?.assignedEmployeeId && event.assignedEmployeeId !== currentEmployeeId) {
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
    if (warningEventId) {
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
            className="w-full max-w-lg glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/20 shrink-0">
              <h2 className={cn("text-xl font-medium text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                Assign Events
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
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 pl-10 pr-4 rtl:pr-10 rtl:pl-4 transition-all outline-none text-secondary text-sm"
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex-1 overflow-y-auto space-y-2">
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
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "bg-primary/20 text-primary" : "bg-black/5 text-secondary/60 group-hover:text-secondary/80"
                        )}>
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-secondary text-sm truncate">{event.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-secondary/60 font-mono">#{event.id} • {event.creationDate}</span>
                            {event.assignedEmployeeId && event.assignedEmployeeId !== currentEmployeeId && (
                              <span className="text-xs font-medium px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-md border border-yellow-200/50 flex items-center gap-1 w-fit">
                                <User className="w-3 h-3" />
                                {MOCK_EMPLOYEES.find(emp => emp.id === event.assignedEmployeeId)?.name || 'Assigned'}
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
                <div className="text-center py-8 text-secondary/60 text-sm">
                  No events found.
                </div>
              )}
            </div>

            <div className="p-6 pt-0 shrink-0">
              <button
                onClick={handleSave}
                className="w-full bg-primary hover:bg-primary-dark text-white rounded-xl py-3 font-medium transition-colors shadow-md shadow-primary/20"
              >
                {t('save' as any)} ({selectedIds.size})
              </button>
            </div>
          </motion.div>

          {/* Warning Modal */}
          <AnimatePresence>
            {warningEventId && (
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
                  className="bg-white rounded-3xl p-6 relative z-10 w-full max-w-sm shadow-2xl"
                >
                  <h3 className="text-lg font-semibold text-secondary mb-2">Event Already Assigned</h3>
                  <p className="text-secondary/70 text-sm mb-6">
                    This event already has an assigned employee. Do you want to unassign him/her and replace him/her with this employee?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setWarningEventId(null)}
                      className="flex-1 py-2 rounded-xl text-secondary/70 bg-secondary/5 hover:bg-secondary/10 font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmAssignment}
                      className="flex-1 py-2 rounded-xl text-white bg-primary hover:bg-primary-dark font-medium transition-colors"
                    >
                      Replace
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
