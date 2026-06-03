import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, Clock, 
  FileText, User, Bell, Building, MapPin, Ticket, Mail, Eye, Plus, Download,
  Users, Upload, Phone, AlertCircle, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import Image from 'next/image';

interface Guest {
  id: string;
  name: string;
  phone: string;
  hasWhatsapp: boolean;
}

export interface AppEvent {
  id: string;
  name: string;
  creationDate: string;
  guests: number;
  invitationsCreated: boolean;
  status: 'completed' | 'paid' | 'installments' | 'unpaid' | 'canceled';
  eventDate?: string;
  eventTime?: string;
  eventCost?: string;
  paymentType?: 'one_payment' | 'installments';
  hallName?: string;
  hallLocation?: string;
  welcomeMessage?: string;
  assignedEmployeeId?: string;
  clientId?: string;
}

interface EventDetailsProps {
  event: AppEvent;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateEvent?: (updatedEvent: AppEvent) => void;
}

const MOCK_EMPLOYEES = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
];

const INITIAL_GUESTS: Guest[] = [
  { id: 'g1', name: 'Adel Al-Rajhi', phone: '+966501234567', hasWhatsapp: true },
  { id: 'g2', name: 'Fahad Al-Saud', phone: '+966509876543', hasWhatsapp: false },
];

interface GuestEditFormProps {
  guest?: Guest | null;
  onBack: () => void;
  onSave: (guest: Guest) => void;
}

function GuestEditForm({ guest, onBack, onSave }: GuestEditFormProps) {
  const { t, dir } = useLanguage();
  const [name, setName] = useState(guest?.name || '');
  const [phoneExt, setPhoneExt] = useState('SA +966');
  const [phoneStr, setPhoneStr] = useState(guest?.phone.replace(/^\+966\s*/, '') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: guest?.id || Math.floor(Math.random() * 10000).toString(),
      name,
      phone: `+966 ${phoneStr}`,
      hasWhatsapp: true
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
          <span className="font-medium">{dir === 'ltr' ? 'Back' : 'الرجوع'}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-2xl mx-auto crystal-accent">
         <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {guest ? (dir === 'ltr' ? 'Edit Guest' : 'تعديل بيانات الضيف') : (dir === 'ltr' ? 'Add Guest' : 'إضافة ضيف')}
         </h2>
         
         <form onSubmit={handleSubmit} className="space-y-5">
           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 rtl:mr-1 rtl:ml-0">
               {dir === 'ltr' ? 'Full Name' : 'الاسم الكامل'}
             </label>
             <input
               type="text"
               required
               value={name}
               onChange={e => setName(e.target.value)}
               className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
               placeholder={dir === 'ltr' ? 'Full Name' : 'الاسم الكامل'}
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 rtl:mr-1 rtl:ml-0">
               {dir === 'ltr' ? 'Phone Number' : 'رقم الهاتف'}
             </label>
             <div className="flex gap-2 relative">
               <select 
                 value={phoneExt}
                 onChange={e => setPhoneExt(e.target.value)}
                 className="bg-white/50 border border-secondary/20 rounded-xl px-2 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary w-28 shrink-0 appearance-none text-center ltr:pr-6 rtl:pl-6 z-10 font-medium"
               >
                 <option value="SA +966">SA +966</option>
                 <option value="AE +971">AE +971</option>
                 <option value="KW +965">KW +965</option>
                 <option value="QA +974">QA +974</option>
                 <option value="BH +973">BH +973</option>
                 <option value="OM +968">OM +968</option>
               </select>
               <div className="absolute top-1/2 -translate-y-1/2 ltr:left-[4.5rem] rtl:right-[4.5rem] pointer-events-none z-20 opacity-50">
                   <ChevronRight className={cn("w-4 h-4", dir === 'rtl' && "rotate-180")} />
               </div>
               
               <input
                 type="tel"
                 required
                 value={phoneStr}
                 onChange={e => setPhoneStr(e.target.value)}
                 className="flex-1 min-w-0 bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary text-left font-mono"
                 placeholder="5x xxx xxxx"
                 dir="ltr"
               />
             </div>
             <p className="text-xs text-secondary/50 mt-1.5 ml-1 rtl:mr-1 rtl:ml-0 flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
               {dir === 'ltr' ? 'Phone number must have WhatsApp' : 'يجب أن يكون الرقم مرتبطاً بواتساب'}
             </p>
           </div>
           
           <div className="pt-4 flex flex-col gap-3 border-t border-secondary/10 mt-8 w-full">
             <button
               type="submit"
               className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
             >
               {dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات'}
             </button>
             <button
               type="button"
               onClick={onBack}
               className="w-full py-3.5 rounded-xl text-secondary hover:bg-secondary/5 font-medium transition-colors cursor-pointer"
             >
               {dir === 'ltr' ? 'Cancel' : 'إلغاء'}
             </button>
           </div>
         </form>
      </div>
    </motion.div>
  );
}

export function EventDetails({ event, onBack, onEdit, onDelete, onUpdateEvent }: EventDetailsProps) {
  const { t, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<'info' | 'guests'>('info');
  const [guests, setGuests] = useState<Guest[]>(INITIAL_GUESTS);
  const [guestSearch, setGuestSearch] = useState('');
  const [whatsappFilter, setWhatsappFilter] = useState<'all' | 'has_whatsapp' | 'no_whatsapp'>('all');
  const [viewClient, setViewClient] = useState<any>(null);
  
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);

  const client = { id: 'c1', name: 'Saleh Al-Fadhel', phone: '+966512345678' }; // mock client

  const filteredGuests = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(guestSearch.toLowerCase()) || g.phone.includes(guestSearch);
    const matchFilter = whatsappFilter === 'all' || 
                        (whatsappFilter === 'has_whatsapp' && g.hasWhatsapp) ||
                        (whatsappFilter === 'no_whatsapp' && !g.hasWhatsapp);
    return matchSearch && matchFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100/60 text-emerald-700 ring-emerald-500/20';
      case 'paid': return 'bg-emerald-100/60 text-emerald-700 ring-emerald-500/20';
      case 'installments': return 'bg-amber-100/60 text-amber-700 ring-amber-500/20';
      case 'unpaid': return 'bg-red-100/60 text-red-700 ring-red-500/20';
      case 'canceled': return 'bg-gray-100 text-gray-600 ring-gray-500/20';
      default: return 'bg-secondary/5 text-secondary ring-secondary/10';
    }
  };

  const onNavigateToEmployees = () => { /* implement navigation */ };

  if (isAddingGuest || guestToEdit) {
    return (
      <GuestEditForm
        guest={guestToEdit}
        onBack={() => {
          setIsAddingGuest(false);
          setGuestToEdit(null);
        }}
        onSave={(updatedGuest) => {
          if (guestToEdit) {
            setGuests(guests.map(g => g.id === updatedGuest.id ? updatedGuest : g));
          } else {
            setGuests([updatedGuest, ...guests]);
          }
          setIsAddingGuest(false);
          setGuestToEdit(null);
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6 pb-10"
    >
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
        >
          {dir === 'ltr' ? (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
          <span className="font-medium">{dir === 'ltr' ? 'Back' : 'الرجوع'}</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
            title={dir === 'ltr' ? 'Edit' : 'تعديل'}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 sm:p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
            title={dir === 'ltr' ? 'Remove' : 'حذف'}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 ltr:right-0 rtl:left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 ltr:left-0 rtl:right-0 w-32 h-32 bg-secondary/5 rounded-full blur-3xl -z-10" />

        <div className="flex flex-row gap-4 sm:gap-6 items-start sm:items-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1 sm:mt-0">
            <Calendar className="w-7 h-7 sm:w-10 sm:h-10" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <h2 className={cn("text-lg sm:text-3xl font-semibold text-secondary leading-tight", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {event.name}
              </h2>
              <div className="relative">
                <select
                 value={event.status}
                 onChange={(e) => {
                   if (onUpdateEvent) {
                     onUpdateEvent({ ...event, status: e.target.value as any });
                   }
                 }}
                 className={cn(
                   "appearance-none cursor-pointer py-0.5 sm:py-1 outline-none rounded-full text-[11px] sm:text-xs font-medium ring-1 ring-inset whitespace-nowrap",
                   dir === 'ltr' ? "pl-2.5 pr-6 sm:pl-3 sm:pr-7" : "pr-2.5 pl-6 sm:pr-3 sm:pl-7",
                   getStatusColor(event.status)
                 )}
                >
                  <option value="unpaid">{dir === 'ltr' ? 'Unpaid' : 'غير مدفوع'}</option>
                  <option value="paid">{dir === 'ltr' ? 'Paid' : 'مدفوع'}</option>
                  <option value="installments">{dir === 'ltr' ? 'Installments' : 'أقساط'}</option>
                  <option value="completed">{dir === 'ltr' ? 'Completed' : 'مكتمل'}</option>
                  <option value="canceled">{dir === 'ltr' ? 'Canceled' : 'ملغي'}</option>
                </select>
                <div className={cn("pointer-events-none absolute inset-y-0 flex items-center", dir === 'ltr' ? 'right-2' : 'left-2')}>
                  <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:gap-4 text-xs sm:text-sm text-secondary/70">
              <span className="flex items-center gap-1.5 font-mono font-medium">
                #{event.id}
              </span>
              <span className="hidden sm:block w-1.5 h-1.5 rounded-full bg-secondary/20" />
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
                  {event.eventDate || '-'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary/20" />
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
                  {event.eventTime || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-secondary/5 rounded-2xl w-fit mx-auto sm:mx-0">
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            "p-2.5 sm:px-6 rounded-xl text-sm font-medium transition-all",
            activeTab === 'info' ? "bg-white text-secondary shadow-sm" : "text-secondary/60 hover:text-secondary hover:bg-white/50"
          )}
        >
          {dir === 'ltr' ? 'Event Info' : 'تفاصيل الحفل'}
        </button>
        <button
          onClick={() => setActiveTab('guests')}
          className={cn(
            "p-2.5 sm:px-6 rounded-xl text-sm font-medium transition-all",
            activeTab === 'guests' ? "bg-white text-secondary shadow-sm" : "text-secondary/60 hover:text-secondary hover:bg-white/50"
          )}
        >
          {dir === 'ltr' ? 'Event Guests' : 'ضيوف الحفل'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'info' ? (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl space-y-5">
                <h3 className="font-semibold text-secondary flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  {dir === 'ltr' ? 'Event Details' : 'تفاصيل الحفل'}
                </h3>
                
                <div className="space-y-4">
                  {client && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                      <span className="text-secondary/60 text-sm flex items-center gap-1.5"><User className="w-4 h-4" />{dir === 'ltr' ? 'Client' : 'العميل'}</span>
                      <button 
                        onClick={() => setViewClient(client)}
                        className="font-medium text-primary hover:text-primary-dark underline hover:bg-primary/5 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                      >
                        {client.name}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Creation Date' : 'تاريخ الإنشاء'}</span>
                    <span className="font-medium text-secondary">{event.creationDate}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Date & Time' : 'التاريخ والوقت'}</span>
                    <span className="font-medium text-secondary" dir="ltr">{event.eventDate || '-'} - {event.eventTime || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Guests' : 'الضيوف'}</span>
                    <span className="font-medium text-secondary">{event.guests}</span>
                  </div>
                  {(event.eventCost || event.paymentType) && (
                    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/50 border border-secondary/5">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Event Cost' : 'تكلفة الحفل'}</span>
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-secondary">{event.eventCost ? `${event.eventCost} SAR` : '-'}</span>
                          <span className="text-xs text-secondary/60">{event.paymentType === 'one_payment' ? (dir === 'ltr' ? 'One Payment' : 'دفعة واحدة') : event.paymentType === 'installments' ? (dir === 'ltr' ? 'Installments' : 'أقساط') : ''}</span>
                        </div>
                      </div>
                      {(event.status === 'unpaid' || event.status === 'installments') && (
                        <button 
                          onClick={() => {
                            if (!client) return;
                            const formattedPhone = client.phone.replace(/\D/g, ''); 
                            const message = dir === 'ltr' 
                              ? `Hello ${client.name},\nThis is a friendly reminder regarding the payment for your event "${event.name}". Please arrange for the payment at your earliest convenience.`
                              : `مرحباً ${client.name}،\nهذا تذكير ودي بخصوص الدفع لمناسبتك "${event.name}". يرجى ترتيب الدفع في أقرب وقت ممكن.`;
                            window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="flex items-center justify-center w-full gap-1.5 mt-1 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary transition-colors rounded-xl text-sm font-medium cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                          {dir === 'ltr' ? 'Send Payment Notification' : 'إرسال إشعار الدفع'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-5">
                <h3 className="font-semibold text-secondary flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  {dir === 'ltr' ? 'Hall Info' : 'معلومات القاعة'}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Name' : 'الاسم'}</span>
                    <span className="font-medium text-secondary">{event.hallName || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Google Maps URL' : 'رابط خرائط جوجل'}</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-secondary truncate">{event.hallLocation || '-'}</span>
                      {event.hallLocation && (
                         <a href={event.hallLocation} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-black/5 rounded-lg text-primary transition-colors shrink-0">
                           <MapPin className="w-4 h-4" />
                         </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-5">
                <h3 className="font-semibold text-secondary flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  {dir === 'ltr' ? 'Welcome Message' : 'رسالة الترحيب'}
                </h3>
                <div className="p-4 rounded-2xl bg-white/50 border border-secondary/5 text-secondary/80 text-sm whitespace-pre-wrap leading-relaxed">
                  {event.welcomeMessage || '-'}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-secondary flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {dir === 'ltr' ? 'Assigned Employee' : 'الموظف المختص'}
                  </h3>
                  {!event.assignedEmployeeId && (
                    <button 
                      onClick={onNavigateToEmployees}
                      className="px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary-dark transition-colors rounded-lg shadow-sm cursor-pointer"
                    >
                      {dir === 'ltr' ? 'Assign' : 'تعيين'}
                    </button>
                  )}
                </div>
                
                {event.assignedEmployeeId ? (
                  <div className="p-4 rounded-2xl bg-white/40 border border-secondary/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <h4 className="font-medium text-secondary truncate">
                        {MOCK_EMPLOYEES.find(e => e.id === event.assignedEmployeeId)?.name || (dir === 'ltr' ? 'Unknown Employee' : 'موظف غير معروف')}
                      </h4>
                      <div className="flex items-center text-xs text-secondary/60 gap-1.5 mt-1">
                        <span className="font-mono">#{event.assignedEmployeeId}</span>
                      </div>
                    </div>
                    <button 
                      onClick={onNavigateToEmployees}
                      className="p-2 text-secondary/40 hover:text-primary hover:bg-primary/5 rounded-xl transition-all cursor-pointer"
                      title={dir === 'ltr' ? 'Change Employee' : 'تغيير الموظف'}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                    <User className="w-10 h-10 text-secondary/20 mb-2" />
                    <p className="text-secondary/60 text-sm">
                      {dir === 'ltr' ? 'No employee is currently assigned to this event.' : 'لا يوجد موظف مختص بهذه المناسبة حالياً.'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-3xl space-y-5">
                <h3 className="font-semibold text-secondary flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  {dir === 'ltr' ? 'Invitations' : 'الدعوات'}
                </h3>
                {event.invitationsCreated ? (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-secondary/5">
                      <span className="text-sm font-medium text-secondary/70">
                        {dir === 'ltr' ? 'Invitations Sent' : 'الدعوات المرسلة'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
                        {event.guests}
                      </span>
                    </div>
                    <button className="w-full py-3 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <Eye className="w-4 h-4" />
                      {dir === 'ltr' ? 'View Invitations' : 'عرض الدعوات'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-secondary/5">
                      <span className="text-sm font-medium text-secondary/70">
                        {dir === 'ltr' ? 'Status' : 'الحالة'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-secondary/10 text-secondary/60">
                        {dir === 'ltr' ? 'Not Created' : 'غير منشأ'}
                      </span>
                    </div>
                    <button className="w-full py-3 bg-primary text-white font-medium rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                      <Plus className="w-4 h-4" />
                      {dir === 'ltr' ? 'Create Invitations' : 'إنشاء دعوات'}
                    </button>
                  </>
                )}
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-5 flex-1 min-h-[300px]">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-secondary flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {dir === 'ltr' ? 'Transactions & Payments' : 'المعاملات والمدفوعات'}
                  </h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 hover:bg-white/60 transition-colors rounded-lg text-xs font-medium text-secondary shadow-sm ring-1 ring-secondary/5 cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                    {dir === 'ltr' ? 'Download PDF' : 'تحميل PDF'}
                  </button>
                </div>
                <div className="flex flex-col items-center justify-center h-48 opacity-50">
                  <FileText className="w-12 h-12 mb-3 text-secondary/30" />
                  <p className="text-sm text-secondary/70 text-center">
                    {dir === 'ltr' ? 'No transactions yet' : 'لا توجد معاملات حتى الآن'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="guests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel rounded-3xl overflow-hidden"
          >
            <div className="p-4 sm:p-6 border-b border-secondary/5 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="font-semibold text-secondary flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {dir === 'ltr' ? 'Guest List' : 'قائمة الضيوف'}
                  <span className="text-xs bg-secondary/10 px-2 py-0.5 rounded-full text-secondary/70">
                    {filteredGuests.length}
                  </span>
                </h3>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none py-2 px-3 sm:px-4 bg-white hover:bg-gray-50 border border-secondary/10 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer">
                    <Upload className="w-4 h-4 shrink-0" />
                    {dir === 'ltr' ? 'Upload Sheet' : 'رفع ملف'}
                  </button>
                  <button 
                    onClick={() => setIsAddingGuest(true)}
                    className="flex-1 sm:flex-none py-2 px-3 sm:px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    {dir === 'ltr' ? 'Add Guest' : 'إضافة ضيف'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40", dir === 'ltr' ? 'left-3' : 'right-3')} />
                  <input
                    type="text"
                    placeholder={dir === 'ltr' ? 'Search by name or phone number' : 'البحث بالاسم أو رقم الهاتف'}
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    className={cn(
                      "w-full bg-white/50 border border-secondary/10 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm",
                      dir === 'ltr' ? 'pl-9 pr-4' : 'pr-9 pl-4'
                    )}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: dir === 'ltr' ? 'All' : 'الكل' },
                    { id: 'has_whatsapp', label: dir === 'ltr' ? 'Has WhatsApp' : 'لديه واتساب' },
                    { id: 'no_whatsapp', label: dir === 'ltr' ? 'No WhatsApp' : 'بدون واتساب' }
                  ].map(filter => (
                    <button
                      key={filter.id}
                      onClick={() => setWhatsappFilter(filter.id as any)}
                      className={cn(
                        "flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap cursor-pointer",
                        whatsappFilter === filter.id
                          ? "bg-primary text-white shadow-sm shadow-primary/20"
                          : "bg-secondary/5 text-secondary/80 hover:bg-secondary/10 hover:text-secondary"
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-secondary/[0.02] p-4">
              <div className="flex flex-col gap-2 sm:gap-3 w-full">
                {filteredGuests.length > 0 ? (
                  filteredGuests.map((guest) => (
                    <div 
                      key={guest.id} 
                      className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:bg-white/60 transition-colors w-full"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-secondary text-base truncate">{guest.name}</h3>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-1.5 sm:gap-3">
                          <div className="flex items-center gap-1 text-secondary/70">
                             <Phone className="w-3.5 h-3.5 shrink-0" />
                             <span className="truncate max-w-full" dir="ltr">{guest.phone}</span>
                          </div>
                          {!guest.hasWhatsapp && (
                            <>
                              <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                              <div className="flex items-center gap-1.5 text-amber-600 font-medium">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{dir === 'ltr' ? 'No WhatsApp' : 'ليس لديه واتساب'}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:gap-2 mt-2 md:mt-0 border-t border-secondary/5 md:border-none pt-2 md:pt-0 shrink-0 min-w-[120px]">
                        <div className="flex items-center gap-1.5 justify-end w-full">
                          <button 
                            title={dir === 'ltr' ? 'Contact via WhatsApp' : 'تواصل عبر الواتساب'}
                            onClick={(e) => {
                              e.preventDefault();
                              if (guest.phone) {
                                // Format phone number to remove spaces, plus sign, etc. if needed
                                const formattedPhone = guest.phone.replace(/[^0-9]/g, '');
                                window.open(`https://wa.me/${formattedPhone}`, '_blank');
                              }
                            }}
                            className="p-2 sm:p-2 bg-white text-[#25D366] border border-transparent hover:bg-[#25D366]/10 hover:border-[#25D366]/30 hover:text-[#128C7E] hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                            </svg>
                          </button>
                          <button 
                            title={dir === 'ltr' ? 'Edit' : 'تعديل'}
                            onClick={() => setGuestToEdit(guest)}
                            className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            title={dir === 'ltr' ? 'Remove' : 'حذف'}
                            onClick={() => setGuests(guests.filter(g => g.id !== guest.id))}
                            className="p-2 sm:p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">{dir === 'ltr' ? 'No guests found' : 'لا يوجد ضيوف'}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
