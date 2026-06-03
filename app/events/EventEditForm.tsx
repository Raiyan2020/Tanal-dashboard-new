import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, User, Calendar, Clock, Building, MapPin, MessageSquare, DollarSign, Bold, Italic, Strikethrough, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { AppEvent } from './EventDetails';

interface EventEditFormProps {
  event: AppEvent | null;
  onBack: () => void;
  onSave: (event: AppEvent) => void;
}

export function EventEditForm({ event, onBack, onSave }: EventEditFormProps) {
  const { t, dir } = useLanguage();
  const [clientId, setClientId] = useState(event?.clientId || '');
  const [eventDate, setEventDate] = useState(event?.eventDate || '');
  const [eventTime, setEventTime] = useState(event?.eventTime || '');
  const [hallName, setHallName] = useState(event?.hallName || '');
  const [hallLocation, setHallLocation] = useState(event?.hallLocation || '');
  const defaultWelcomeMessage = dir === 'ltr' ? 'Welcome to our event!' : 'أهلاً بك في حفلنا!';
  const [welcomeMessage, setWelcomeMessage] = useState(event?.welcomeMessage || defaultWelcomeMessage);
  const [totalCost, setTotalCost] = useState(event?.eventCost || '');
  const [paymentType, setPaymentType] = useState(event?.paymentType || 'one_payment');
  const [isPaid, setIsPaid] = useState(event?.status === 'paid' || event?.status === 'completed');

  // mock clients
  const clients = [
    { id: 'c1', name: 'Saleh Al-Fadhel' },
    { id: 'c2', name: 'Noura Al-Bader' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     onSave({
       id: event?.id || Math.floor(Math.random() * 10000).toString(),
       name: hallName, 
       creationDate: event?.creationDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
       guests: event?.guests || 0,
       invitationsCreated: event?.invitationsCreated || false,
       status: isPaid ? 'paid' : (paymentType === 'installments' ? 'installments' : 'unpaid'),
       eventDate,
       eventTime,
       eventCost: totalCost,
       paymentType: paymentType as any,
       hallName,
       hallLocation,
       welcomeMessage,
       assignedEmployeeId: event?.assignedEmployeeId,
       clientId
     });
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
          <span className="font-medium">{t('back' as any)}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-2xl mx-auto crystal-accent">
         <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {event ? (dir === 'ltr' ? 'Edit Event' : 'تعديل الحفل') : (dir === 'ltr' ? 'Add Event' : 'إضافة حفل')}
         </h2>
         <form onSubmit={handleSubmit} className="space-y-5">
           
           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2 cursor-pointer">
               <User className="w-4 h-4 text-secondary/50" />
               {dir === 'ltr' ? 'Select Client' : 'اختر العميل'} <span className="text-red-500">*</span>
             </label>
             <select 
               value={clientId}
               onChange={e => setClientId(e.target.value)}
               className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none font-medium cursor-pointer"
               required
             >
               <option value="" disabled>{dir === 'ltr' ? 'Choose a client...' : 'اختر عميلاً...'}</option>
               {clients.map(c => (
                 <option key={c.id} value={c.id}>{c.name}</option>
               ))}
             </select>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-secondary/50" />
                 {dir === 'ltr' ? 'Event Date' : 'تاريخ الحفل'} <span className="text-red-500">*</span>
               </label>
               <input
                 type="date"
                 required
                 value={eventDate}
                 onChange={e => setEventDate(e.target.value)}
                 className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
                 <Clock className="w-4 h-4 text-secondary/50" />
                 {dir === 'ltr' ? 'Event Time' : 'وقت الحفل'} <span className="text-red-500">*</span>
               </label>
               <input
                 type="time"
                 required
                 value={eventTime}
                 onChange={e => setEventTime(e.target.value)}
                 className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
               />
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
               <Building className="w-4 h-4 text-secondary/50" />
               {dir === 'ltr' ? 'Hall Name' : 'اسم القاعة'} <span className="text-red-500">*</span>
             </label>
             <input
               type="text"
               required
               value={hallName}
               onChange={e => setHallName(e.target.value)}
               className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
               <MapPin className="w-4 h-4 text-secondary/50" />
               {dir === 'ltr' ? 'Hall Location (Google Maps Link)' : 'موقع القاعة (رابط خرائط جوجل)'} <span className="text-secondary/50 text-xs font-normal mx-1">({dir === 'ltr' ? 'Optional' : 'اختياري'})</span>
             </label>
             <input
               type="url"
               value={hallLocation}
               onChange={e => setHallLocation(e.target.value)}
               className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
               <MessageSquare className="w-4 h-4 text-secondary/50" />
               {dir === 'ltr' ? 'WhatsApp Welcome Message' : 'رسالة ترحيب واتساب'} <span className="text-red-500">*</span>
             </label>
             <div className="w-full bg-white/50 border border-secondary/20 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
               <div className="flex items-center gap-2 px-3 py-2 border-b border-secondary/10 bg-white/50">
                 <button type="button" className="p-1.5 hover:bg-black/5 rounded text-secondary/70"><Bold className="w-4 h-4" /></button>
                 <button type="button" className="p-1.5 hover:bg-black/5 rounded text-secondary/70"><Italic className="w-4 h-4" /></button>
                 <button type="button" className="p-1.5 hover:bg-black/5 rounded text-secondary/70"><Strikethrough className="w-4 h-4" /></button>
               </div>
               <textarea
                 required
                 rows={4}
                 value={welcomeMessage}
                 onChange={e => setWelcomeMessage(e.target.value)}
                 className="w-full px-4 py-3 focus:outline-none text-secondary resize-none bg-transparent"
               ></textarea>
             </div>
           </div>

           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
               <DollarSign className="w-4 h-4 text-secondary/50" />
               {dir === 'ltr' ? 'Total Cost' : 'التكلفة الإجمالية'} <span className="text-red-500">*</span>
             </label>
             <input
               type="number"
               required
               value={totalCost}
               onChange={e => setTotalCost(e.target.value)}
               className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
             />
           </div>

           <div className="pt-2">
             <label className="flex items-center gap-2 cursor-pointer">
               <input 
                 type="checkbox" 
                 checked={isPaid}
                 onChange={e => setIsPaid(e.target.checked)}
                 className="w-4 h-4 rounded text-primary bg-white border-secondary/30 focus:ring-primary/30"
               />
               <span className="text-sm text-secondary/80 font-medium">{dir === 'ltr' ? 'Is Paid?' : 'هل تم الدفع؟'}</span>
             </label>
           </div>

           {!isPaid && (
             <div className="pt-2">
               <label className="block text-sm font-medium text-secondary/80 mb-2 mx-1">
                 {dir === 'ltr' ? 'Payment Type' : 'نوع الدفع'}
               </label>
               <div className="flex items-center gap-6">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="paymentType" 
                     checked={paymentType === 'one_payment'} 
                     onChange={() => setPaymentType('one_payment')}
                     className="w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                   />
                   <span className="text-sm text-secondary/80 font-medium">{dir === 'ltr' ? 'One Payment' : 'دفعة واحدة'}</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input 
                     type="radio" 
                     name="paymentType" 
                     checked={paymentType === 'installments'} 
                     onChange={() => setPaymentType('installments')}
                     className="w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                   />
                   <span className="text-sm text-secondary/80 font-medium">{dir === 'ltr' ? 'Two Installments' : 'دفعتين'}</span>
                 </label>
               </div>
             </div>
           )}
           <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-secondary/10 mt-8 w-full">
             <button
               type="button"
               onClick={onBack}
               className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-secondary/20 bg-white/50 text-secondary hover:bg-white/80 font-medium transition-colors cursor-pointer"
             >
               {dir === 'ltr' ? 'Cancel' : 'إلغاء'}
             </button>
             <button
               type="submit"
               className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
             >
               {event ? (dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات') : <><Send className={cn("w-4 h-4", dir === 'rtl' && "rotate-180")} /> {dir === 'ltr' ? 'Create & Send Link' : 'إنشاء وإرسال الرابط'}</>}
             </button>
           </div>
         </form>
      </div>
    </motion.div>
  );
}
