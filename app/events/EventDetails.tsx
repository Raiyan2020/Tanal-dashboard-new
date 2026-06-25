import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Edit2, Trash2, Calendar, Clock,
  FileText, User, Bell, Building, MapPin, Ticket, Mail, Eye, Plus, Download,
  Users, Upload, Phone, AlertCircle, Search, Loader2, Banknote, CheckCircle2, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { getEventById, getClientById, updateEventPaymentStatus, getEventGuests, createEventGuest, importEventGuests, updateEventGuest, deleteEventGuest, type EventDetailData, type Client, type ApiGuest } from '@/lib/api';
import { COUNTRIES } from '@/app/clients/_client-form';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';
import { GuestEditForm, type Guest } from './GuestEditForm';
import { ClientDetailModal } from './ClientDetailModal';

function mapApiGuest(g: ApiGuest): Guest {
  return {
    id: String(g.id),
    name: g.name,
    phone: g.full_phone || g.phone,
    hasWhatsapp: g.have_whatsapp,
    invitationSent: g.invitation_sent,
    checkedIn: g.checked_in,
  };
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
  reference_number?: number;
  status_label?: string;
  actions?: {
    can_delete: boolean;
    can_edit: boolean;
    can_update_payment: boolean;
  };
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





export function EventDetails({ event, onBack, onEdit, onDelete, onUpdateEvent }: EventDetailsProps) {
  const { t, dir } = useLanguage();
  const router = useRouter();
  const token = getToken() ?? '';

  const [detail, setDetail] = useState<EventDetailData | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    if (!token || !event.id) return;
    setDetailLoading(true);
    getEventById(Number(event.id), token)
      .then(async (res) => {
        setDetail(res.data);
        if (res.data.details.client_id) {
          try {
            const clientRes = await getClientById(res.data.details.client_id, token);
            setClient(clientRes.data);
          } catch (err) {
            console.error('Failed to load client details:', err);
          }
        }
      })
      .catch((err) => {
        toast.error((err as Error).message || 'حدث خطأ أثناء تحميل تفاصيل الحفل');
      })
      .finally(() => {
        setDetailLoading(false);
      });
  }, [token, event.id]);

  const [activeTab, setActiveTab] = useState<'info' | 'guests'>('info');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestSearch, setGuestSearch] = useState('');
  const [whatsappFilter, setWhatsappFilter] = useState<'all' | 'has_whatsapp' | 'no_whatsapp'>('all');
  const [guestPage, setGuestPage] = useState(1);
  const [guestTotalPages, setGuestTotalPages] = useState(1);
  const [guestTotal, setGuestTotal] = useState(0);
  const GUEST_PER_PAGE = 15;
  const [viewClient, setViewClient] = useState<any>(null);

  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [guestToEdit, setGuestToEdit] = useState<Guest | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    setIsUploading(true);
    const uploadToast = toast.loading(dir === 'ltr' ? 'Uploading sheet...' : 'جاري رفع الملف...');
    try {
      const res = await importEventGuests(Number(event.id), file, token);
      toast.dismiss(uploadToast);

      const importedCount = res.data?.imported ?? 0;
      const failedCount = res.data?.failed ?? 0;

      if (res.response_status.error) {
        toast.error(res.msg || (dir === 'ltr' ? 'Failed to import guests' : 'فشل استيراد الضيوف'));
      } else {
        toast.success(
          dir === 'ltr'
            ? `Successfully imported ${importedCount} guests. Failed: ${failedCount}.`
            : `تم استيراد ${importedCount} من الضيوف بنجاح. فشل: ${failedCount}.`
        );
        setRefreshTrigger(prev => prev + 1);
        getEventById(Number(event.id), token)
          .then((detailRes) => {
            setDetail(detailRes.data);
          })
          .catch(() => { });
      }
    } catch (err) {
      toast.dismiss(uploadToast);
      toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to upload sheet' : 'فشل رفع الملف'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteGuest = async (guestId: string) => {
    const confirmDelete = window.confirm(
      dir === 'ltr' ? 'Are you sure you want to delete this guest?' : 'هل أنت متأكد من حذف هذا الضيف؟'
    );
    if (!confirmDelete) return;

    const deleteToast = toast.loading(dir === 'ltr' ? 'Deleting guest...' : 'جاري حذف الضيف...');
    try {
      await deleteEventGuest(Number(event.id), Number(guestId), token);
      toast.dismiss(deleteToast);
      toast.success(dir === 'ltr' ? 'Guest deleted successfully' : 'تم حذف الضيف بنجاح');
      
      setGuests(prev => prev.filter(g => g.id !== guestId));
      setGuestTotal(prev => Math.max(0, prev - 1));
      
      getEventById(Number(event.id), token)
        .then((detailRes) => {
          setDetail(detailRes.data);
        })
        .catch(() => {});
    } catch (err) {
      toast.dismiss(deleteToast);
      toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to delete guest' : 'فشل حذف الضيف'));
    }
  };


  // Fetch guests from API whenever tab is active, page changes, or filter changes
  useEffect(() => {
    if (!token || !event.id) return;
    // Only auto-fetch when the guests tab is open
    if (activeTab !== 'guests') return;

    setGuestLoading(true);
    const hasWhatsappParam =
      whatsappFilter === 'has_whatsapp' ? true
        : whatsappFilter === 'no_whatsapp' ? false
          : null;

    getEventGuests(
      Number(event.id),
      { page: guestPage, per_page: GUEST_PER_PAGE, has_whatsapp: hasWhatsappParam ?? undefined },
      token
    )
      .then((res) => {
        setGuests(res.data.items.map(mapApiGuest));
        setGuestTotalPages(res.data.pagination.last_page);
        setGuestTotal(res.data.pagination.total);
      })
      .catch((err) => {
        toast.error((err as Error).message || 'حدث خطأ أثناء تحميل قائمة الضيوف');
      })
      .finally(() => {
        setGuestLoading(false);
      });
  }, [token, event.id, activeTab, guestPage, whatsappFilter, refreshTrigger]);

  // Reset to page 1 when filter changes
  const handleWhatsappFilterChange = (filter: 'all' | 'has_whatsapp' | 'no_whatsapp') => {
    setWhatsappFilter(filter);
    setGuestPage(1);
  };

  // Client-side search on already-loaded page
  const filteredGuests = guests.filter(g =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase()) || g.phone.includes(guestSearch)
  );

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

  if (detailLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAddingGuest || guestToEdit) {
    return (
      <GuestEditForm
        guest={guestToEdit}
        eventId={Number(event.id)}
        token={token}
        onBack={() => {
          setIsAddingGuest(false);
          setGuestToEdit(null);
        }}
        onSave={(savedGuest) => {
          if (guestToEdit) {
            setGuests(guests.map(g => g.id === savedGuest.id ? savedGuest : g));
          } else {
            // Refresh guest list to reflect newly added guest from server
            setGuestPage(1);
            setGuests(prev => [savedGuest, ...prev]);
            setGuestTotal(prev => prev + 1);
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
          {detail?.actions?.can_edit && (
            <button
              onClick={onEdit}
              className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
              title={dir === 'ltr' ? 'Edit' : 'تعديل'}
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          {detail?.actions?.can_delete && (
            <button
              onClick={onDelete}
              className="p-2 sm:p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
              title={dir === 'ltr' ? 'Remove' : 'حذف'}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
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
                {event.name || detail?.details?.client_name}
              </h2>
              <div className="relative">
                <select
                  value={detail?.financial_transaction?.status === 'cancelled' ? 'canceled' : (detail?.financial_transaction?.status || event.status)}
                  disabled={detail ? !detail.actions.can_update_payment : true}
                  onChange={async (e) => {
                    const nextVal = e.target.value as any;
                    const apiStatus = nextVal === 'canceled' ? 'cancelled' : nextVal;
                    try {
                      await updateEventPaymentStatus(Number(event.id), apiStatus, token);
                      toast.success(dir === 'ltr' ? 'Payment status updated successfully' : 'تم تحديث حالة الدفع بنجاح');
                      if (onUpdateEvent) {
                        onUpdateEvent({ ...event, status: nextVal });
                      }
                      if (detail) {
                        setDetail({
                          ...detail,
                          financial_transaction: {
                            ...detail.financial_transaction,
                            status: apiStatus
                          }
                        });
                      }
                    } catch (err) {
                      toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to update payment status' : 'فشل في تحديث حالة الدفع'));
                    }
                  }}
                  className={cn(
                    "appearance-none cursor-pointer py-0.5 sm:py-1 outline-none rounded-full text-[11px] sm:text-xs font-medium ring-1 ring-inset whitespace-nowrap",
                    dir === 'ltr' ? "pl-2.5 pr-6 sm:pl-3 sm:pr-7" : "pr-2.5 pl-6 sm:pr-3 sm:pl-7",
                    getStatusColor(detail?.financial_transaction?.status || event.status)
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
                  {detail?.details?.event_date || event.eventDate || '-'}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-secondary/20" />
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-70" />
                  {detail?.details?.event_time || event.eventTime || '-'}
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
                    <span className="font-medium text-secondary">{detail?.details?.created_at || event.creationDate}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Date & Time' : 'التاريخ والوقت'}</span>
                    <span className="font-medium text-secondary" dir="ltr">{detail?.details?.event_date || event.eventDate || '-'} - {detail?.details?.event_time || event.eventTime || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Guests' : 'الضيوف'}</span>
                    <span className="font-medium text-secondary">{detail?.details?.guest_count ?? event.guests}</span>
                  </div>
                  {(detail?.financial_transaction || event.eventCost || event.paymentType) && (
                    <div className="flex flex-col gap-2 p-3 rounded-2xl bg-white/50 border border-secondary/5">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary/60 text-sm">{dir === 'ltr' ? 'Event Cost' : 'تكلفة الحفل'}</span>
                        <div className="flex flex-col items-end">
                          <span className="font-medium text-secondary">
                            {detail?.financial_transaction
                              ? `${parseFloat(detail.financial_transaction.total_cost).toLocaleString()} KWD`
                              : event.eventCost ? `${event.eventCost} KWD` : '-'}
                          </span>
                          <span className="text-xs text-secondary/60">
                            {detail?.financial_transaction
                              ? (detail.financial_transaction.payment_type === 'single'
                                ? (dir === 'ltr' ? 'One Payment' : 'دفعة واحدة')
                                : (dir === 'ltr' ? 'Two Installments' : 'قسطين'))
                              : (event.paymentType === 'one_payment'
                                ? (dir === 'ltr' ? 'One Payment' : 'دفعة واحدة')
                                : event.paymentType === 'installments'
                                  ? (dir === 'ltr' ? 'Installments' : 'أقساط')
                                  : '')}
                          </span>
                        </div>
                      </div>
                      {(detail?.financial_transaction?.status === 'unpaid' ||
                        detail?.financial_transaction?.status === 'installments' ||
                        event.status === 'unpaid' ||
                        event.status === 'installments') && (
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
                    <span className="font-medium text-secondary">{detail?.hall?.name || event.hallName || '-'}</span>
                  </div>
                  <div className="flex flex-col gap-3 p-3 rounded-2xl bg-white/50 border border-secondary/5">
                    <span className="text-secondary/60 text-sm font-medium">{dir === 'ltr' ? 'Location Map' : 'خريطة الموقع'}</span>
                    {(detail?.hall?.location_url || event.hallLocation) ? (
                      <div className="space-y-3 w-full">

                        <a
                          href={detail?.hall?.location_url || event.hallLocation}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary transition-colors rounded-xl text-xs font-semibold cursor-pointer shadow-sm"
                        >
                          <MapPin className="w-4 h-4" />
                          {dir === 'ltr' ? 'Open in Google Maps' : 'الذهاب إلى خرائط جوجل'}
                        </a>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-secondary/50 italic">-</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-5">
                <h3 className="font-semibold text-secondary flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" />
                  {dir === 'ltr' ? 'Welcome Message' : 'رسالة الترحيب'}
                </h3>
                <div className="p-4 rounded-2xl bg-white/50 border border-secondary/5 text-secondary/80 text-sm whitespace-pre-wrap leading-relaxed">
                  {detail?.welcome_message || event.welcomeMessage || '-'}
                </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-secondary flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    {dir === 'ltr' ? 'Assigned Employee' : 'الموظف المختص'}
                  </h3>
                  {!(detail?.employees && detail.employees.length > 0) && !event.assignedEmployeeId && (
                    <button
                      onClick={onNavigateToEmployees}
                      className="px-3 py-1.5 text-xs font-medium bg-primary text-white hover:bg-primary-dark transition-colors rounded-lg shadow-sm cursor-pointer"
                    >
                      {dir === 'ltr' ? 'Assign' : 'تعيين'}
                    </button>
                  )}
                </div>

                {detail?.employees && detail.employees.length > 0 ? (
                  detail.employees.map((emp) => (
                    <div key={emp.id} className="p-4 rounded-2xl bg-white/40 border border-secondary/5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <h4 className="font-medium text-secondary truncate">
                          {emp.name}
                        </h4>
                        <div className="flex items-center text-xs text-secondary/60 gap-1.5 mt-1">
                          <span className="font-mono">#{emp.id}</span>
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
                  ))
                ) : event.assignedEmployeeId ? (
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
                {event.invitationsCreated || (detail?.invitations && detail.invitations.sent_whatsapp_count > 0) ? (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-secondary/5">
                      <span className="text-sm font-medium text-secondary/70">
                        {dir === 'ltr' ? 'Invitations Sent' : 'الدعوات المرسلة'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 font-mono">
                        {detail?.invitations?.sent_whatsapp_count ?? event.guests}
                      </span>
                    </div>
                    <button
                      onClick={() => router.push(`/invitations?eventId=${event.id}`)}
                      className="w-full py-3 bg-primary/10 text-primary font-medium rounded-xl hover:bg-primary/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
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
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-secondary/10 text-secondary/60 font-medium">
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
                    <Banknote className="w-5 h-5 text-primary" />
                    {dir === 'ltr' ? 'Transactions & Payments' : 'المعاملات والمدفوعات'}
                  </h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 hover:bg-white/60 transition-colors rounded-lg text-xs font-medium text-secondary shadow-sm ring-1 ring-secondary/5 cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                    {dir === 'ltr' ? 'Download PDF' : 'تحميل PDF'}
                  </button>
                </div>

                {detail?.financial_transaction ? (
                  <div className="space-y-6">
                    {/* Visual Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-secondary/60">
                        <span>{dir === 'ltr' ? 'Payment Progress' : 'نسبة سداد المبلغ'}</span>
                        <span className="font-mono">
                          {Math.round(
                            (parseFloat(detail.financial_transaction.paid_amount) /
                              parseFloat(detail.financial_transaction.total_cost)) *
                            100
                          )}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-secondary/5 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                0,
                                (parseFloat(detail.financial_transaction.paid_amount) /
                                  parseFloat(detail.financial_transaction.total_cost)) *
                                100
                              )
                            )}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Financial Summary Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-secondary/5 border border-secondary/5 flex flex-col justify-center">
                        <span className="text-[10px] sm:text-xs text-secondary/60 font-medium mb-1 truncate">
                          {dir === 'ltr' ? 'Total Cost' : 'المبلغ الإجمالي'}
                        </span>
                        <span className="text-xs sm:text-base font-bold text-secondary font-mono truncate">
                          {parseFloat(detail.financial_transaction.total_cost).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-secondary/40 font-semibold mt-0.5">KWD</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center">
                        <span className="text-[10px] sm:text-xs text-emerald-700/80 font-medium mb-1 truncate">
                          {dir === 'ltr' ? 'Paid Amount' : 'المبلغ المدفوع'}
                        </span>
                        <span className="text-xs sm:text-base font-bold text-emerald-600 font-mono truncate">
                          {parseFloat(detail.financial_transaction.paid_amount).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-emerald-500/60 font-semibold mt-0.5">KWD</span>
                      </div>

                      <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col justify-center">
                        <span className="text-[10px] sm:text-xs text-amber-700/80 font-medium mb-1 truncate">
                          {dir === 'ltr' ? 'Remaining' : 'المتبقي'}
                        </span>
                        <span className="text-xs sm:text-base font-bold text-amber-600 font-mono truncate">
                          {parseFloat(detail.financial_transaction.remaining_amount).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-amber-500/60 font-semibold mt-0.5">KWD</span>
                      </div>
                    </div>

                    {/* Installments Details timeline */}
                    {detail.financial_transaction.payment_type === 'two_installments' && (
                      <div className="border-t border-secondary/10 pt-4 space-y-3">
                        <h4 className="text-xs font-semibold text-secondary/80">
                          {dir === 'ltr' ? 'Installments Breakdown' : 'تفاصيل الأقساط'}
                        </h4>
                        <div className="space-y-2">
                          {/* First Installment */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/40 border border-secondary/5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-xs font-medium text-secondary">
                                {dir === 'ltr' ? 'First Installment' : 'القسط الأول'}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-bold text-secondary font-mono">
                                {detail.financial_transaction.first_installment_amount
                                  ? parseFloat(detail.financial_transaction.first_installment_amount).toLocaleString()
                                  : '-'}
                              </span>
                              <span className="text-[9px] text-secondary/40 font-semibold ml-1 rtl:mr-1"> KWD</span>
                            </div>
                          </div>

                          {/* Second Installment */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/40 border border-secondary/5">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "w-2 h-2 rounded-full",
                                parseFloat(detail.financial_transaction.remaining_amount) <= 0
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                              )} />
                              <span className="text-xs font-medium text-secondary">
                                {dir === 'ltr' ? 'Second Installment' : 'القسط الثاني'}
                              </span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <div>
                                <span className="text-xs font-bold text-secondary font-mono">
                                  {detail.financial_transaction.second_installment_amount
                                    ? parseFloat(detail.financial_transaction.second_installment_amount).toLocaleString()
                                    : '-'}
                                </span>
                                <span className="text-[9px] text-secondary/40 font-semibold ml-1 rtl:mr-1"> KWD</span>
                              </div>
                              {detail.financial_transaction.second_installment_due_date && (
                                <span className="text-[9px] text-secondary/50 font-mono mt-0.5">
                                  {dir === 'ltr' ? 'Due: ' : 'يستحق في: '}{detail.financial_transaction.second_installment_due_date}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 opacity-50">
                    <FileText className="w-12 h-12 mb-3 text-secondary/30" />
                    <p className="text-sm text-secondary/70 text-center">
                      {dir === 'ltr' ? 'No transactions yet' : 'لا توجد معاملات حتى الآن'}
                    </p>
                  </div>
                )}
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
                  <span className="text-xs bg-secondary/10 px-2 py-0.5 rounded-full text-secondary/70 font-mono">
                    {guestTotal}
                  </span>
                </h3>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx,.xls"
                    className="hidden"
                  />
                  <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="flex-1 sm:flex-none py-2 px-3 sm:px-4 bg-white hover:bg-gray-50 border border-secondary/10 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    ) : (
                      <Upload className="w-4 h-4 shrink-0" />
                    )}
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
                      onClick={() => handleWhatsappFilterChange(filter.id as any)}
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
              {guestLoading ? (
                <div className="flex flex-col gap-2 sm:gap-3 w-full">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-3 sm:p-4 rounded-2xl bg-white/40 border border-secondary/5 animate-pulse flex items-center gap-3">
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-4 bg-secondary/10 rounded-lg w-1/3" />
                        <div className="h-3 bg-secondary/8 rounded-lg w-1/2" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-xl bg-secondary/10" />
                        <div className="w-8 h-8 rounded-xl bg-secondary/10" />
                        <div className="w-8 h-8 rounded-xl bg-secondary/10" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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
                              <span className="truncate max-w-full font-mono" dir="ltr">{guest.phone}</span>
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
                          {/* Status badges row */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                              guest.invitationSent
                                ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20"
                                : "bg-secondary/5 text-secondary/50 ring-1 ring-secondary/10"
                            )}>
                              <Send className="w-3 h-3" />
                              {guest.invitationSent
                                ? (dir === 'ltr' ? 'Invitation Sent' : 'تم الإرسال')
                                : (dir === 'ltr' ? 'Not Sent' : 'لم يرسل')}
                            </span>
                            {guest.checkedIn && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600 ring-1 ring-blue-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                {dir === 'ltr' ? 'Checked In' : 'حضر'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:gap-2 mt-2 md:mt-0 border-t border-secondary/5 md:border-none pt-2 md:pt-0 shrink-0 min-w-[120px]">
                          <div className="flex items-center gap-1.5 justify-end w-full">
                            {
                              guest.hasWhatsapp ? <button
                                title={dir === 'ltr' ? 'Contact via WhatsApp' : 'تواصل عبر الواتساب'}
                                onClick={(e) => {
                                  e.preventDefault();
                                  if (guest.phone) {
                                    const formattedPhone = guest.phone.replace(/[^0-9]/g, '');
                                    window.open(`https://wa.me/${formattedPhone}`, '_blank');
                                  }
                                }}
                                className="p-2 sm:p-2 bg-white text-[#25D366] border border-transparent hover:bg-[#25D366]/10 hover:border-[#25D366]/30 hover:text-[#128C7E] hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                </svg>
                              </button> : null
                            }
                            <button
                              title={dir === 'ltr' ? 'Edit' : 'تعديل'}
                              onClick={() => setGuestToEdit(guest)}
                              className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              title={dir === 'ltr' ? 'Delete' : 'حذف'}
                              onClick={() => handleDeleteGuest(guest.id)}
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
              )}

              {/* Pagination */}
              {!guestLoading && guestTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4 mt-2 border-t border-secondary/5">
                  <button
                    onClick={() => setGuestPage(p => Math.max(1, p - 1))}
                    disabled={guestPage <= 1}
                    className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <span className="text-xs text-secondary/60 font-mono px-2">
                    {guestPage} / {guestTotalPages}
                  </span>
                  <button
                    onClick={() => setGuestPage(p => Math.min(guestTotalPages, p + 1))}
                    disabled={guestPage >= guestTotalPages}
                    className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Detail Popup Modal */}
      <ClientDetailModal
        client={viewClient}
        onClose={() => setViewClient(null)}
      />

    </motion.div>
  );
}
