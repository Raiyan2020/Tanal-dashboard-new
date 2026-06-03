'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Eye, Edit2, Trash2, UserSearch, XCircle, CheckCircle2, Clock, CreditCard, ChevronLeft, ChevronRight, User, Phone, Mail, Download, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes?: string;
}

const initialClients: Client[] = [
  { id: '1001', name: 'Abdulrahman Al Saud', phone: '+966 50 123 4567', email: 'a.alsaud@example.com', notes: 'VIP Client. Requires dedicated support line. Preferred contact method is WhatsApp.' },
  { id: '1002', name: 'Mohammed Al Rajhi', phone: '+966 55 987 6543', email: 'm.alrajhi@example.com' },
  { id: '1003', name: 'Sara Al Olayan', phone: '+966 53 456 7890', email: 's.alolayan@example.com', notes: 'Event dates are usually inflexible. Follow up regarding pending installments.' },
  { id: '1004', name: 'Fahad Al Jasser', phone: '+966 56 111 2222', email: 'f.aljasser@example.com' },
];

type EventStatus = 'canceled' | 'completed' | 'paid' | 'unpaid' | 'installments';

interface AppEvent {
  id: string;
  name: string;
  creationDate: string;
  guests: number;
  invitationsCreated: boolean;
  status: EventStatus;
  paymentFraction: string;
}

const MOCK_CLIENT_EVENTS: AppEvent[] = [
  { id: '1001', name: 'Al Rajhi Ceremony', creationDate: 'Oct 15, 2026', guests: 420, invitationsCreated: true, status: 'completed', paymentFraction: '1/1' },
  { id: '1003', name: 'Ahmed Wedding', creationDate: 'Nov 05, 2026', guests: 300, invitationsCreated: true, status: 'installments', paymentFraction: '1/6' },
];

const MOCK_CLIENT_TRANSACTIONS = [
  { id: 'tx-1', eventName: 'Al Rajhi Ceremony', date: 'Oct 15, 2026', amount: 50000 },
  { id: 'tx-1-1', eventName: 'Al Rajhi Ceremony', date: 'Oct 17, 2026', amount: 20000 },
  { id: 'tx-2', eventName: 'Ahmed Wedding', date: 'Nov 05, 2026', amount: 15000 },
];

interface ClientEditFormProps {
  client: Client | null;
  onBack: () => void;
  onSave: (client: Client) => void;
}

function ClientEditForm({ client, onBack, onSave }: ClientEditFormProps) {
  const { t, dir } = useLanguage();
  const [name, setName] = useState(client?.name || '');
  const [phoneExt, setPhoneExt] = useState('SA +966');
  const [phoneStr, setPhoneStr] = useState(client?.phone.replace(/^\+966\s*/, '') || '');
  const [email, setEmail] = useState(client?.email || '');
  const [notes, setNotes] = useState(client?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: client?.id || Math.floor(Math.random() * 10000).toString(),
      name,
      phone: `+966 ${phoneStr}`,
      email,
      notes
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
            {client ? t('editClient' as any) : t('addClient' as any)}
         </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('fullName' as any) || 'Full Name'} <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
              placeholder="Mohammed Khalid"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('phoneNumber' as any) || 'Phone Number'} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative shrink-0 w-[120px]">
                 <select 
                   value={phoneExt}
                   onChange={e => setPhoneExt(e.target.value)}
                   className="w-full appearance-none bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-4 pr-10 rtl:pr-4 rtl:pl-10 transition-all outline-none text-secondary text-sm font-medium h-full"
                 >
                   <option>SA +966</option>
                 </select>
                 <div className="absolute inset-y-0 right-0 rtl:left-0 rtl:right-auto flex items-center pr-3 rtl:pl-3 pointer-events-none text-secondary/50">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                 </div>
              </div>
              <input 
                type="tel" 
                value={phoneStr}
                onChange={(e) => setPhoneStr(e.target.value)}
                required
                dir="ltr"
                className="flex-1 min-w-0 bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
                placeholder="50 123 4567"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f5e9] text-[#2e7d32] rounded-lg text-xs font-medium mt-1">
              <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WhatsApp" width={14} height={14} className="opacity-80 drop-shadow-sm" referrerPolicy="no-referrer" />
              {t('phoneMustHaveWhatsapp' as any) || 'Phone number must have WhatsApp'}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('emailOptional' as any) || 'Email (Optional)'}
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
              placeholder="mohammed.k@example.com"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('notesOptional' as any) || 'Notes (Optional)'}
            </label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary resize-none"
              rows={4}
            />
          </div>

          <button 
            type="submit"
            className="w-full mt-6 bg-primary hover:bg-primary-dark text-white rounded-xl py-3.5 font-medium transition-all shadow-md hover:shadow-lg flex justify-center items-center gap-2 group cursor-pointer"
          >
            {t('saveChanges' as any) || 'Save Changes'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

interface ClientDetailsProps {
  client: Client;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onNavigateToEvent?: (eventId: string) => void;
}

function ClientDetails({ client, onBack, onEdit, onDelete, onNavigateToEvent }: ClientDetailsProps) {
  const { t, dir } = useLanguage();

  const getStatusDisplay = (status: EventStatus, fraction: string) => {
    if (status === 'canceled') {
      return { label: t('canceled' as any), className: 'bg-red-100 text-red-600', icon: XCircle };
    }
    if (status === 'completed') {
      return { label: t('completed' as any), className: 'bg-emerald-100 text-emerald-600', icon: CheckCircle2 };
    }
    if (status === 'paid') {
      return { label: t('paid' as any), className: 'bg-emerald-100 text-emerald-600', icon: CheckCircle2 };
    }
    if (status === 'unpaid') {
      return { label: t('unpaid' as any), className: 'bg-orange-100 text-orange-600', icon: Clock };
    }
    if (status === 'installments') {
      return { label: `${t('installments' as any)} (${fraction})`, className: 'bg-blue-100 text-blue-600', icon: CreditCard };
    }
    return { label: status, className: 'bg-secondary/10 text-secondary', icon: Clock };
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full"
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
          <span className="font-medium">{t('back' as any)}</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
            title={t('editClient' as any)}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 sm:p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
            title={t('remove' as any)}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 border-gray-400">
                <h2 className={cn("text-2xl font-semibold text-secondary truncate", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                  {client.name}
                </h2>
                <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60 shrink-0">
                  #{client.id}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/70 gap-2 sm:gap-4">
                <span className="flex items-center gap-1.5" dir="ltr">
                  <Phone className="w-4 h-4 opacity-70 shrink-0" />
                  {client.phone}
                </span>
                <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                <span className="flex items-center gap-1.5 truncate">
                  <Mail className="w-4 h-4 opacity-70 shrink-0" />
                  {client.email}
                </span>
              </div>
            </div>
          </div>
          <button
            title="WhatsApp"
            onClick={() => window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank')}
            className="p-3 bg-white text-emerald-600 border border-transparent hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer shrink-0"
          >
            <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WhatsApp" width={24} height={24} className="object-contain" referrerPolicy="no-referrer" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events Table */}
        <div className="glass-panel rounded-3xl p-6">
          <h3 className={cn("text-lg font-semibold text-secondary mb-4", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('events' as any)}
          </h3>
          <div className="flex flex-col gap-3">
            {MOCK_CLIENT_EVENTS.length > 0 ? (
              MOCK_CLIENT_EVENTS.map(event => {
                const statusInfo = getStatusDisplay(event.status, event.paymentFraction);
                const StatusIcon = statusInfo.icon;
                return (
                  <div 
                    key={event.id} 
                    className="p-3 rounded-2xl bg-white/40 border border-secondary/5 flex flex-col gap-2 cursor-pointer hover:bg-white/60 transition-colors"
                    onClick={() => onNavigateToEvent && onNavigateToEvent(event.id)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-secondary truncate">{event.name}</h4>
                        <div className="flex items-center text-xs text-secondary/60 gap-2 mt-1">
                          <span className="truncate">{event.creationDate}</span>
                          <span className="w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                          <span className="truncate">{event.guests} {t('guests' as any)}</span>
                        </div>
                      </div>
                      <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium shrink-0", statusInfo.className)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusInfo.label}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-secondary/40 text-sm">
                No events found for this client.
              </div>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className={cn("text-lg font-semibold text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {t('transactions' as any)}
            </h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 hover:bg-white/60 transition-colors rounded-lg text-xs font-medium text-secondary shadow-sm ring-1 ring-secondary/5 cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              {dir === 'ltr' ? 'Download PDF' : 'تحميل PDF'}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {MOCK_CLIENT_TRANSACTIONS.length > 0 ? (
              MOCK_CLIENT_TRANSACTIONS.map(tx => (
                <div key={tx.id} className="p-3 rounded-2xl bg-white/40 border border-secondary/5 flex justify-between items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-secondary text-sm truncate">{tx.eventName}</h4>
                    <span className="text-xs text-secondary/60 block mt-0.5">{tx.date}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-semibold text-emerald-600 font-mono text-sm">
                      {tx.amount.toLocaleString()} {t('sar' as any)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-secondary/40 text-sm">
                No transactions found for this client.
              </div>
            )}
          </div>
        </div>
      </div>

      {client.notes && (
        <div className="glass-panel rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className={cn("text-lg font-semibold text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {dir === 'ltr' ? 'Notes' : 'الملاحظات'}
            </h3>
          </div>
          <div className="p-4 rounded-2xl bg-white/40 border border-secondary/5 text-secondary/80 whitespace-pre-wrap text-sm leading-relaxed">
            {client.notes}
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface ClientDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function ClientDeleteModal({ isOpen, onClose, onConfirm }: ClientDeleteModalProps) {
  const { t, dir } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl"
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className={cn("text-xl font-semibold text-secondary mb-2", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('deleteClientTitle' as any) || 'Delete Client'}
          </h3>
          <p className="text-secondary/70 mb-8">
            {t('deleteClientMessage' as any) || 'Are you sure you want to delete this client? This action cannot be undone.'}
          </p>
          <div className="w-full flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/50 hover:bg-white/80 text-secondary border border-white/60 rounded-xl py-3 font-medium transition-all shadow-sm cursor-pointer"
            >
              {t('cancel' as any) || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
            >
              {t('remove' as any) || 'Remove'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ClientsPage() {
  const { t, dir } = useLanguage();
  
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [clientToView, setClientToView] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  const filteredClients = useMemo(() => {
    return clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [clients, searchTerm]);

  const handleSaveClient = (newClient: Client) => {
    if (clientToEdit) {
      setClients(clients.map(c => c.id === newClient.id ? newClient : c));
      if (clientToView?.id === newClient.id) {
          setClientToView(newClient);
      }
    } else {
      setClients([newClient, ...clients]);
    }
    setIsEditing(false);
    setClientToEdit(null);
  };

  return (
    <>
      <AnimatePresence>
        {clientToDelete && (
          <ClientDeleteModal
            isOpen={!!clientToDelete}
            onClose={() => setClientToDelete(null)}
            onConfirm={() => {
              setClients(clients.filter(c => c.id !== clientToDelete));
              setClientToDelete(null);
              if (clientToView?.id === clientToDelete) {
                setClientToView(null);
              }
            }}
          />
        )}
      </AnimatePresence>
      
      {isEditing ? (
        <ClientEditForm 
          client={clientToEdit}
          onBack={() => {
             setIsEditing(false);
             setClientToEdit(null);
          }}
          onSave={handleSaveClient}
        />
      ) : clientToView ? (
        <ClientDetails
          client={clientToView}
          onBack={() => setClientToView(null)}
          onEdit={() => {
            setClientToEdit(clientToView);
            setIsEditing(true);
          }}
          onDelete={() => setClientToDelete(clientToView.id)}
        />
      ) : (
        <div className="space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className={cn("text-2xl font-medium text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {t('clients')}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {clients.length}
            </span>
          </div>
          
          <button 
            onClick={() => { setClientToEdit(null); setIsEditing(true); }}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('addClient' as any)}
          </button>
        </div>

        <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
          <div className="mb-4 sm:mb-6 relative w-full">
            <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-3 sm:px-4 pointer-events-none text-secondary/40">
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <input
              type="text"
              placeholder={t('searchClients')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2 sm:py-3 pl-10 pr-4 rtl:pr-10 rtl:pl-4 transition-all outline-none text-secondary text-sm sm:text-base"
            />
          </div>

          <div className="w-full">
            {filteredClients.length > 0 ? (
              <div className="flex flex-col gap-2 sm:gap-3 w-full">
                <AnimatePresence>
                  {filteredClients.map((client) => (
                    <motion.div 
                      key={client.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => setClientToView(client)}
                      className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors w-full"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">#{client.id}</span>
                          <h3 className="font-semibold text-secondary text-base truncate m-0">{client.name}</h3>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-0.5 sm:gap-3">
                           <span className="truncate max-w-full" dir="ltr">{client.phone}</span>
                           <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                           <span className="truncate max-w-full">{client.email}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0 mt-1 md:mt-0">
                        <button 
                          title="WhatsApp"
                          onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank'); }}
                          className="p-2 sm:p-2.5 bg-white text-emerald-600 border border-transparent hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                        >
                          <Image src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png" alt="WhatsApp" width={18} height={18} className="object-contain" referrerPolicy="no-referrer" />
                        </button>
                        <button 
                          title={t('view')} 
                          onClick={(e) => { e.stopPropagation(); setClientToView(client); }}
                          className="p-2 sm:p-2.5 bg-white text-secondary/60 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          title={t('edit' as any)} 
                          onClick={(e) => { e.stopPropagation(); setClientToEdit(client); setIsEditing(true); }}
                          className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          title={t('remove')} 
                          onClick={(e) => { e.stopPropagation(); setClientToDelete(client.id); }}
                          className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
                <UserSearch className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">No clients found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
}
