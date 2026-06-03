import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Upload, Ticket, Calendar, Clock, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { Invitation } from './page';

interface InvitationEditFormProps {
  invitation?: Invitation | null;
  onBack: () => void;
  onSave: (invitation: Invitation) => void;
}

export function InvitationEditForm({ invitation, onBack, onSave }: InvitationEditFormProps) {
  const { t, dir } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [eventId, setEventId] = useState(invitation?.eventId || '');
  const [logic, setLogic] = useState<'strict' | 'default_accept' | 'view_only'>('strict');
  
  // Extract date and time if it's stored in deadlineDate or just use state
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  
  // Handle file upload UI state
  const [fileName, setFileName] = useState('');

  // MOCK EVENTS
  const eventsList = [
    { id: '1001', name: 'Al Rajhi Ceremony' },
    { id: '1002', name: 'Al Olayan Reception' },
    { id: '1003', name: 'Ahmed Wedding' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEvent = eventsList.find(ev => ev.id === eventId);
    onSave({
      id: invitation?.id || `INV-${Math.floor(Math.random() * 10000)}`,
      eventId: eventId,
      eventName: selectedEvent?.name || eventId || 'Unnamed Event',
      deadlineDate: deadlineDate ? `${deadlineDate} ${deadlineTime}`.trim() : (invitation?.deadlineDate || 'No Deadline'),
      guestsNumber: invitation?.guestsNumber || 0,
      status: invitation?.status || 'unsent'
    });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileName(e.target.files[0].name);
    }
  };

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
          <span className="font-medium">{t('back' as any) || 'Back'}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-2xl mx-auto crystal-accent">
         <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {invitation ? (t('editInvitation' as any) || 'Edit Invitation') : (t('createInvitation' as any) || 'Create Invitation')}
         </h2>
         <form onSubmit={handleSubmit} className="space-y-6">
           
           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 flex items-center gap-2 cursor-pointer">
               <Ticket className="w-4 h-4 text-secondary/50" />
               Select Event <span className="text-red-500">*</span>
             </label>
             <select 
               value={eventId}
               onChange={e => setEventId(e.target.value)}
               className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none font-medium cursor-pointer"
               required
             >
               <option value="" disabled>Choose a event...</option>
               {eventsList.map(ev => (
                 <option key={ev.id} value={ev.id}>{ev.name}</option>
               ))}
             </select>
           </div>
           
           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-2 ml-1">
               Invitation Logic <span className="text-red-500">*</span>
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
                   <span className="block text-sm font-medium text-secondary">Strict Action</span>
                   <span className="block text-xs text-secondary/60 mt-0.5">If no response, recorded as declined.</span>
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
                   <span className="block text-sm font-medium text-secondary">Default Accept</span>
                   <span className="block text-xs text-secondary/60 mt-0.5">If no response, recorded as accepted.</span>
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
                   <span className="block text-sm font-medium text-secondary">View Only</span>
                   <span className="block text-xs text-secondary/60 mt-0.5">Accepted right away, for informing only.</span>
                 </div>
               </label>
             </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-secondary/50" />
                 Deadline <span className="text-red-500">*</span>
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
                 Time <span className="text-red-500">*</span>
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
               Upload Design
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
                 accept=".png,.jpg,.jpeg,.pdf"
                 onChange={handleFileSelect}
               />
               <Upload className="w-8 h-8 text-secondary/40 mb-3" />
               <p className="text-sm font-medium text-secondary mb-1">
                 {fileName ? fileName : 'Upload Design'}
               </p>
               <p className="text-xs text-secondary/50">
                 PNG, JPG, PDF up to 10MB
               </p>
             </div>
           </div>
           
           <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-secondary/10 mt-8 w-full">
             <button
               type="button"
               onClick={onBack}
               className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-secondary/20 bg-white/50 text-secondary hover:bg-white/80 font-medium transition-colors cursor-pointer"
             >
               Cancel
             </button>
             <button
               type="submit"
               className="w-full sm:flex-1 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
             >
               {invitation ? 'Save Changes' : 'Create Invitation'}
             </button>
           </div>
         </form>
      </div>
    </motion.div>
  );
}
