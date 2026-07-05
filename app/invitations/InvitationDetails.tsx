import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Invitation } from './InvitationsClient';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, Eye, Clock, Send, MousePointerClick,
  MoreHorizontal, ArrowLeft, ArrowRight, Edit2, Ticket, Users,
  Settings, ImageIcon, QrCode, UploadCloud, PieChart as PieChartIcon,
  BarChart3, Calendar, AlertCircle, Search, SortDesc, User, Loader2,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { ConfirmModal } from './ConfirmModal';
import { getInvitationById, getInvitationGuests, sendInvitation, type InvitationDetailData, type InvitationGuest as ApiInvitationGuest, type CreateInvitationResponse } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

export type InvitationGuestStatus = 'pending' | 'accepted' | 'declined';

export interface InvitationGuest {
  id: string;
  name: string;
  phone: string;
  status: InvitationGuestStatus;
  have_whatsapp?: boolean;
}

const MOCK_GUESTS: Record<string, InvitationGuest[]> = {
  'INV-1001': [
    { id: '1', name: 'Mohammed Ali', phone: '+966 50 111 2233', status: 'accepted' },
    { id: '2', name: 'Khalid Saif', phone: '+966 55 222 3344', status: 'declined' },
    { id: '3', name: 'Ahmed Abdullah', phone: '+966 54 333 4455', status: 'pending' },
    { id: '4', name: 'Fahad Rashid', phone: '+966 53 444 5566', status: 'pending' },
    { id: '5', name: 'Saud Nasser', phone: '+966 50 555 6677', status: 'accepted' },
  ],
  'INV-1005': []
};

interface CheckIn {
  id: string;
  guestName: string;
  phoneNumber: string;
  checkInTime: string;
}

const MOCK_CHECKINS: CheckIn[] = [
  { id: '1', guestName: 'Mohammed Khalid', phoneNumber: '+966 50 123 4567', checkInTime: '2023-08-15T19:30:00Z' },
  { id: '2', guestName: 'Sarah Ahmed', phoneNumber: '+966 55 987 6543', checkInTime: '2023-08-15T19:45:00Z' },
  { id: '3', guestName: 'Abdullah Saad', phoneNumber: '+966 54 321 0987', checkInTime: '2023-08-15T20:10:00Z' },
  { id: '4', guestName: 'Layla Mansour', phoneNumber: '+966 56 789 0123', checkInTime: '2023-08-15T20:25:00Z' },
  { id: '5', guestName: 'Fahad Saeed', phoneNumber: '+966 53 456 7890', checkInTime: '2023-08-15T20:40:00Z' },
];

export function AttendanceDetails({ onBack, attendanceNumber, employeeName }: { onBack: () => void; attendanceNumber: number; employeeName: string }) {
  const { t, dir } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const filteredAndSortedCheckIns = useMemo(() => {
    let result = MOCK_CHECKINS.filter(c =>
      c.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phoneNumber.includes(searchTerm)
    );

    result.sort((a, b) => {
      const dateA = new Date(a.checkInTime).getTime();
      const dateB = new Date(b.checkInTime).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [searchTerm, sortOrder]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer"
        >
          {dir === 'ltr' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
        </button>
        <h2 className={cn("text-2xl font-medium text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {t('attendanceDetails' as any) || (dir === 'ltr' ? 'Attendance Details' : 'تفاصيل الحضور')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-secondary/60 text-sm">{t('attendanceNumber' as any) || (dir === 'ltr' ? 'Attendance Number' : 'رقم الحضور')}</p>
            <p className="text-xl font-bold text-secondary">{attendanceNumber}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-secondary/60 text-sm">{t('assignedEmployee' as any) || (dir === 'ltr' ? 'Assigned Employee' : 'الموظف المختص')}</p>
            <p className="text-xl font-bold text-secondary">{employeeName || '-'}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            {t('qrCheckIns' as any) || (dir === 'ltr' ? 'QR Check-ins' : 'تسجيلات الحضور عبر مسح الرمز')}
          </h3>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40", dir === 'ltr' ? 'left-3' : 'right-3')} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchGuestOrPhone' as any) || (dir === 'ltr' ? 'Search guest or phone...' : 'البحث عن ضيف أو رقم هاتف...')}
                className={cn(
                  "w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2 transition-all outline-none text-secondary text-sm",
                  dir === 'ltr' ? 'pl-9 pr-4' : 'pr-9 pl-4'
                )}
              />
            </div>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-2 border border-secondary/10 bg-white/50 rounded-xl hover:bg-white/80 transition-colors flex items-center gap-2 text-secondary text-sm font-medium shrink-0 cursor-pointer"
              title={dir === 'ltr' ? 'Sort by Time' : 'ترتيب حسب الوقت'}
            >
              <SortDesc className={cn("w-4 h-4 transition-transform", sortOrder === 'asc' ? 'rotate-180' : '')} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {filteredAndSortedCheckIns.map(checkIn => (
            <div key={checkIn.id} className="p-4 rounded-2xl bg-white/40 border border-secondary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/60 hover:border-secondary/10 transition-all">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-secondary">{checkIn.guestName}</span>
                <span className="text-sm text-secondary/60" dir="ltr" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>{checkIn.phoneNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-sm font-medium">
                  {new Date(checkIn.checkInTime).toLocaleTimeString(dir === 'rtl' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {filteredAndSortedCheckIns.length === 0 && (
            <div className="py-10 text-center text-secondary/40">
              {t('noCheckInsFound' as any) || (dir === 'ltr' ? 'No check-ins found.' : 'لم يتم العثور على تسجيلات حضور.')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

const StatCard = ({ title, value, icon: Icon, colorClass, subtitle }: any) => (
  <div className="bg-white/40 p-5 rounded-3xl border border-secondary/5 flex flex-col items-center justify-center gap-2 relative overflow-hidden group">
    <div className={cn("p-3 rounded-2xl mb-1", colorClass)}>
      <Icon className="w-6 h-6" />
    </div>
    <div className="text-2xl font-bold text-secondary">{value}</div>
    <div className="text-secondary/60 text-sm font-medium">{title}</div>
    {subtitle && <div className="text-xs text-secondary/40">{subtitle}</div>}
  </div>
);

interface InvitationDetailsProps {
  invitation: Invitation;
  onBack: () => void;
  onNavigateToEventGuests?: (eventId: string) => void;
  onEdit?: (invitation: Invitation) => void;
}

export function InvitationDetails({ invitation, onBack, onNavigateToEventGuests, onEdit }: InvitationDetailsProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  const [activeTab, setActiveTab] = useState<'info' | 'guests'>('info');
  const [guestSearch, setGuestSearch] = useState('');
  const [debouncedGuestSearch, setDebouncedGuestSearch] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState<'all' | InvitationGuestStatus>('all');
  const [isDesignHovered, setIsDesignHovered] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<InvitationGuest | null>(null);
  const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentInvitationData, setSentInvitationData] = useState<CreateInvitationResponse | null>(null);

  const [detail, setDetail] = useState<InvitationDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  const [guests, setGuests] = useState<InvitationGuest[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestPage, setGuestPage] = useState(1);
  const [guestTotalPages, setGuestTotalPages] = useState(1);

  const refreshDetails = useCallback(async (showLoader = false) => {
    if (!token || !invitation.id) return;
    if (showLoader) setDetailLoading(true);
    try {
      const res = await getInvitationById(Number(invitation.id), token);
      setDetail(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء تحميل تفاصيل الدعوة');
    } finally {
      if (showLoader) setDetailLoading(false);
    }
  }, [token, invitation.id]);

  // Fetch full details
  useEffect(() => {
    refreshDetails(true);
  }, [refreshDetails]);

  const handleSendInvitation = async () => {
    if (!token || !invitation.id) return;
    setShowSendConfirm(false);

    const sendToast = toast.loading(dir === 'ltr' ? 'Sending invitation...' : 'جاري إرسال الدعوة...');
    setIsSending(true);
    try {
      const res = await sendInvitation(Number(invitation.id), token);
      toast.dismiss(sendToast);
      toast.success(res.msg || (dir === 'ltr' ? 'Invitation sent successfully!' : 'تم إرسال الدعوة بنجاح!'));
      setSentInvitationData(res.data);
      await refreshDetails(false);
    } catch (err) {
      toast.dismiss(sendToast);
      toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to send invitation' : 'فشل إرسال الدعوة'));
    } finally {
      setIsSending(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedGuestSearch(guestSearch);
      setGuestPage(1);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [guestSearch]);

  // Fetch guests from API
  const fetchGuests = useCallback(async () => {
    if (!token) return;
    const eventIdParam = detail?.event_id || Number(invitation.eventId);
    if (!eventIdParam) return;

    setGuestLoading(true);
    try {
      const apiStatus = guestStatusFilter === 'all' ? undefined : (guestStatusFilter === 'declined' ? 'rejected' : guestStatusFilter);
      const res = await getInvitationGuests({
        page: guestPage,
        per_page: 15,
        keyword: debouncedGuestSearch || undefined,
        status: apiStatus,
        event_id: eventIdParam,
      }, token);

      const mapped = res.data.items.map((g) => ({
        id: String(g.id),
        name: g.name,
        phone: g.full_phone,
        status: (g.status === 'rejected' ? 'declined' : g.status) as any,
        have_whatsapp: g.have_whatsapp,
      }));

      setGuests(mapped);
      setGuestTotalPages(res.data.pagination.last_page);
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء تحميل الضيوف');
    } finally {
      setGuestLoading(false);
    }
  }, [token, detail?.event_id, invitation.eventId, guestPage, debouncedGuestSearch, guestStatusFilter]);

  useEffect(() => {
    if (activeTab === 'guests') {
      fetchGuests();
    }
  }, [activeTab, fetchGuests]);

  const isPastEvent = detail ? detail.actions.status === 'previous' : invitation.status === 'past';
  const hasGuests = guests.length > 0 || debouncedGuestSearch !== '' || guestStatusFilter !== 'all' || guestLoading;

  if (detailLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showAttendanceDetails && detail) {
    return (
      <AttendanceDetails
        onBack={() => setShowAttendanceDetails(false)}
        attendanceNumber={detail.attendance?.checked_in?.count || 0}
        employeeName={dir === 'ltr' ? 'Mohammed Khalid' : 'محمد خالد'}
      />
    );
  }

  const getGuestStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending': return { icon: Clock, label: t('pending' as any) || (dir === 'ltr' ? 'Pending' : 'قيد الانتظار'), color: 'text-amber-500 bg-amber-50 ring-amber-500/20' };
      case 'accepted': return { icon: CheckCircle2, label: t('accepted' as any) || (dir === 'ltr' ? 'Accepted' : 'مقبول'), color: 'text-emerald-500 bg-emerald-50 ring-emerald-500/20' };
      case 'declined': return { icon: XCircle, label: t('declined' as any) || (dir === 'ltr' ? 'Declined' : 'مرفوض'), color: 'text-red-600 bg-red-50 ring-red-500/20' };
      default: return { icon: MoreHorizontal, label: status, color: 'text-gray-500 bg-gray-50 ring-gray-500/20' };
    }
  };

  const attendanceData = detail ? [
    {
      name: t('attendance' as any) || (dir === 'ltr' ? 'Attendance' : 'الحضور'),
      Attended: detail.attendance?.checked_in?.count || 0,
      NotAttended: detail.attendance?.not_checked_in?.count || 0
    }
  ] : [];

  return (
    <>
      <div className="space-y-6 pb-10">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white hover:bg-secondary/5 text-secondary transition-colors shadow-sm ring-1 ring-black/5"
            >
              {dir === 'ltr' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className={cn("text-2xl font-semibold text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                  {invitation.eventName}
                </h2>
                <span className="px-2.5 py-1 text-xs font-medium bg-secondary/5 text-secondary/60 rounded-lg font-mono">
                  {invitation.id}
                </span>
              </div>
            </div>
          </div>

          {!isPastEvent && (
            <button
              onClick={() => onEdit?.(invitation)}
              className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer w-11 h-11 shrink-0"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 p-1 bg-secondary/5 rounded-2xl w-fit mx-auto sm:mx-0">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              "p-2.5 sm:px-6 rounded-xl text-sm font-medium transition-all",
              activeTab === 'info' ? "bg-white text-secondary shadow-sm" : "text-secondary/60 hover:text-secondary hover:bg-white/50"
            )}
          >
            {t('invitationInfo' as any) || (dir === 'ltr' ? 'Invitation Info' : 'معلومات الدعوة')}
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={cn(
              "p-2.5 sm:px-6 rounded-xl text-sm font-medium transition-all",
              activeTab === 'guests' ? "bg-white text-secondary shadow-sm" : "text-secondary/60 hover:text-secondary hover:bg-white/50"
            )}
          >
            {t('guests' as any) || (dir === 'ltr' ? 'Guests' : 'الضيوف')}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'info' ? (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-1 space-y-6">
                  <div className="glass-panel p-6 rounded-3xl">
                    <h3 className="font-semibold text-secondary mb-4 flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-primary" />
                      {t('details' as any) || (dir === 'ltr' ? 'Details' : 'التفاصيل')}
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-white/40 rounded-2xl flex items-center justify-between border border-secondary/5">
                        <div className="flex items-center gap-3 text-secondary/60">
                          <Calendar className="w-5 h-5" />
                          <span className="text-sm">{t('deadline' as any) || (dir === 'ltr' ? 'Deadline' : 'الموعد النهائي')}</span>
                        </div>
                        <span className="font-medium text-secondary">{detail?.details.deadline_date || invitation.deadlineDate}</span>
                      </div>
                      <div className="p-4 bg-white/40 rounded-2xl flex items-center justify-between border border-secondary/5">
                        <div className="flex items-center gap-3 text-secondary/60">
                          <Users className="w-5 h-5" />
                          <span className="text-sm">{t('numOfGuests' as any) || (dir === 'ltr' ? 'Num of Guests' : 'عدد الضيوف')}</span>
                        </div>
                        <span className="font-medium text-secondary">{detail?.details.guest_count || invitation.guestsNumber}</span>
                      </div>
                      <div className="p-4 bg-white/40 rounded-2xl flex items-center justify-between border border-secondary/5">
                        <div className="flex items-center gap-3 text-secondary/60">
                          <Settings className="w-5 h-5" />
                          <span className="text-sm">{t('logic' as any) || (dir === 'ltr' ? 'Logic' : 'المنطق')}</span>
                        </div>
                        <span className="font-medium text-secondary">{detail?.details.logic_type_label || t('strictAction' as any) || (dir === 'ltr' ? 'Strict Action' : 'إجراء صارم')}</span>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      {
                        detail?.actions.can_be_sent ?

                          <button
                            onClick={() => setShowSendConfirm(true)}
                            disabled={isSending}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-light text-white font-medium shadow-xl shadow-primary/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSending ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Send className="w-5 h-5" />
                            )}
                            {t('sendInvitation' as any) || (dir === 'ltr' ? 'Send Invitation' : 'إرسال الدعوة')}
                          </button> : null
                      }
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-3xl hidden lg:block">
                    <h3 className="font-semibold text-secondary mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      {t('designImage' as any) || (dir === 'ltr' ? 'Design Image' : 'صورة التصميم')}
                    </h3>
                    <div
                      className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-inner group border-4 border-white/40"
                      onMouseEnter={() => setIsDesignHovered(true)}
                      onMouseLeave={() => setIsDesignHovered(false)}
                    >
                      {detail?.design.design_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={detail.design.design_url}
                          alt="Invitation design"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-stone-100 to-stone-200 p-6 flex flex-col items-center justify-center text-center">
                          <div className="w-20 h-20 rounded-full border border-stone-300 mb-6 flex items-center justify-center bg-stone-50">
                            <Ticket className="w-8 h-8 text-stone-400" />
                          </div>
                          <h4 className="text-2xl font-serif text-stone-800 mb-2">{invitation.eventName}</h4>
                          <p className="text-stone-500 text-sm mb-8 font-medium">{t('youAreCordiallyInvited' as any) || (dir === 'ltr' ? 'You are cordially invited' : 'أنتم مدعوون بكل مودة')}</p>
                          <div className="mt-auto bg-white p-3 rounded-xl shadow-sm border border-stone-200">
                            <QrCode className="w-24 h-24 text-stone-800" />
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {isDesignHovered && detail?.design.can_be_changed && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
                          >
                            <button className="px-5 py-2.5 bg-white text-secondary rounded-xl font-medium shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                              <UploadCloud className="w-4 h-4" />
                              {t('replaceDesign' as any) || (dir === 'ltr' ? 'Replace Design' : 'تغيير التصميم')}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard title={t('totalSent' as any) || (dir === 'ltr' ? 'Total Sent' : 'إجمالي المرسل')} value={detail?.response_stats.total_sent.count || 0} icon={Send} colorClass="bg-blue-100 text-blue-600" />
                    <StatCard title={t('accepted' as any) || (dir === 'ltr' ? 'Accepted' : 'مقبول')} value={detail?.response_stats.accepted.count || 0} icon={CheckCircle2} colorClass="bg-emerald-100 text-emerald-600" subtitle={detail ? `${detail.response_stats.accepted.percentage}%` : ''} />
                    <StatCard title={t('declined' as any) || (dir === 'ltr' ? 'Declined' : 'مرفوض')} value={detail?.response_stats.rejected.count || 0} icon={XCircle} colorClass="bg-red-100 text-red-600" subtitle={detail ? `${detail.response_stats.rejected.percentage}%` : ''} />
                    <StatCard title={t('pending' as any) || (dir === 'ltr' ? 'Pending' : 'قيد الانتظار')} value={detail?.response_stats.pending.count || 0} icon={Clock} colorClass="bg-amber-100 text-amber-600" subtitle={detail ? `${detail.response_stats.pending.percentage}%` : ''} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Attendance Bar Chart */}
                    <div className="glass-panel p-6 rounded-3xl h-[300px] flex flex-col md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-secondary flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          {t('eventAttendance' as any) || (dir === 'ltr' ? 'Event Attendance' : 'حضور الحفل')}
                        </h3>
                        {isPastEvent && (
                          <button
                            onClick={() => setShowAttendanceDetails(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 hover:bg-white/60 transition-colors rounded-lg text-xs font-medium text-secondary shadow-sm ring-1 ring-secondary/5 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            {t('qrCheckIns' as any) || (dir === 'ltr' ? 'QR Check-ins' : 'تسجيلات الحضور عبر مسح الرمز')}
                          </button>
                        )}
                      </div>
                      {isPastEvent ? (
                        <div className="flex-1 relative min-h-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                              <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              />
                              <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              <Bar dataKey="Attended" fill="#10b981" radius={[4, 4, 0, 0]} barSize={80} name={t('attended' as any) || (dir === 'ltr' ? 'Attended' : 'حضر')} />
                              <Bar dataKey="NotAttended" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={80} name={t('didntAttend' as any) || (dir === 'ltr' ? "Didn't Attend" : "لم يحضر")} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-secondary/10 rounded-2xl bg-white/30">
                          <Calendar className="w-12 h-12 text-secondary/30 mb-3" />
                          <p className="text-secondary/60 font-medium">{t('statsAvailableAfterEvent' as any) || (dir === 'ltr' ? 'Stats will be available after the event' : 'ستتوفر الإحصائيات بعد الحفل')}</p>
                        </div>
                      )}
                    </div>
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
              className="space-y-6"
            >
              {!hasGuests ? (
                <div className="glass-panel p-10 rounded-3xl flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-amber-50 text-amber-500 mb-6 flex items-center justify-center shadow-inner">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-secondary mb-3">{t('noGuestsFound' as any) || (dir === 'ltr' ? 'No Guests Found' : 'لم يتم العثور على ضيوف')}</h3>
                  <p className="text-secondary/60 max-w-sm mb-8">
                    {t('noGuestsFoundMsg' as any) || (dir === 'ltr' ? 'You haven\'t uploaded any guests to this event yet. Please navigate to the event details to add guests.' : 'لم تقم بإضافة أي ضيوف لهذا الحفل بعد. يرجى التوجه لتفاصيل الحفل لإضافة الضيوف.')}
                  </p>
                  <button
                    onClick={() => onNavigateToEventGuests?.(invitation.eventId)}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 cursor-pointer"
                  >
                    {t('goToEventGuests' as any) || (dir === 'ltr' ? 'Go to Event Guests' : 'الذهاب لضيوف الحفل')}
                  </button>
                </div>
              ) : (
                <div className="glass-panel p-4 sm:p-6 rounded-3xl">
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative w-full sm:w-[80%]">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40", dir === 'ltr' ? 'left-4' : 'right-4')} />
                      <input
                        type="text"
                        placeholder={t('searchByGuestNamePhone' as any) || (dir === 'ltr' ? "Search by name or phone..." : "البحث بالاسم أو رقم الهاتف...")}
                        value={guestSearch}
                        onChange={(e) => setGuestSearch(e.target.value)}
                        className={cn(
                          "w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 transition-all outline-none text-secondary",
                          dir === 'ltr' ? 'pl-10 pr-4' : 'pr-10 pl-4'
                        )}
                      />
                    </div>
                    <div className="w-full sm:w-[20%]">
                      <div className="relative w-full">
                        <select
                          value={guestStatusFilter}
                          onChange={(e) => setGuestStatusFilter(e.target.value as any)}
                          className={cn(
                            "w-full sm:min-w-[200px] appearance-none bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 cursor-pointer transition-all outline-none text-secondary",
                            dir === 'ltr' ? 'pl-4 pr-10' : 'pr-4 pl-10'
                          )}
                        >
                          <option value="all">{t('allStatuses' as any) || (dir === 'ltr' ? 'All Statuses' : 'جميع الحالات')}</option>
                          <option value="accepted">{t('accepted' as any) || (dir === 'ltr' ? 'Accepted' : 'مقبول')}</option>
                          <option value="declined">{t('declined' as any) || (dir === 'ltr' ? 'Declined' : 'مرفوض')}</option>
                          <option value="pending">{t('pending' as any) || (dir === 'ltr' ? 'Pending' : 'قيد الانتظار')}</option>
                        </select>
                        <div className={cn("absolute top-1/2 -translate-y-1/2 pointer-events-none text-secondary/40", dir === 'ltr' ? 'right-4' : 'left-4')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 min-h-[150px] relative">
                    {guestLoading && (
                      <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      </div>
                    )}

                    {guests.length > 0 ? (
                      guests.map((guest: InvitationGuest) => {
                        const StatusInfo = getGuestStatusDisplay(guest.status);
                        const StatusIcon = StatusInfo.icon;

                        return (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={guest.id}
                            onClick={() => setSelectedGuest(guest)}
                            className="bg-white/60 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-secondary/5 hover:bg-white transition-colors cursor-pointer group"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-secondary">{guest.name}</span>
                              <span className="text-secondary/60 text-sm" dir="ltr" style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>{guest.phone}</span>
                            </div>

                            <div className="flex items-center justify-end gap-3 shrink-0">
                              <div className={cn("px-3 py-1.5 rounded-full flex items-center gap-1.5 w-fit", StatusInfo.color)}>
                                <StatusIcon className="w-3.5 h-3.5" />
                                <span className="text-xs font-semibold">{StatusInfo.label}</span>
                              </div>
                              <button
                                title={dir === 'ltr' ? "Contact via WhatsApp" : "تواصل عبر الواتساب"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (guest.phone) {
                                    const formattedPhone = guest.phone.replace(/[^0-9]/g, '');
                                    window.open(`https://wa.me/${formattedPhone}`, '_blank');
                                  }
                                }}
                                className="p-2 bg-white text-[#25D366] border border-transparent hover:bg-[#25D366]/10 hover:border-[#25D366]/30 hover:text-[#128C7E] hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                </svg>
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      !guestLoading && (
                        <div className="py-12 text-center text-secondary/40">
                          {t('noGuestsMatch' as any) || (dir === 'ltr' ? 'No guests match your search criteria' : 'لا يوجد ضيوف يطابقون معايير البحث المستعملة')}
                        </div>
                      )
                    )}
                  </div>

                  {/* Guests Pagination Controls */}
                  {!guestLoading && guestTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-6 mt-4 border-t border-secondary/5">
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
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmModal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={handleSendInvitation}
        title={t('confirmSendInvitation' as any) || (dir === 'ltr' ? 'Send Invitation' : 'إرسال الدعوة')}
        message={t('confirmSendInvitationMessage' as any) || (dir === 'ltr' ? 'Are you sure you want to send this invitation to all guests?' : 'هل أنت متأكد من رغبتك في إرسال هذه الدعوة لجميع الضيوف؟')}
        confirmLabel={t('sendInvitation' as any) || (dir === 'ltr' ? 'Send Invitation' : 'إرسال الدعوة')}
        confirmColor="bg-primary hover:bg-primary-dark"
      />

      {/* Send Success Popup Modal */}
      <AnimatePresence>
        {sentInvitationData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl p-6 sm:p-8 flex flex-col gap-6"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-bounce" />
                </div>
                <h3 className="text-xl font-bold text-secondary">
                  {dir === 'ltr' ? 'Invitation Sent Successfully!' : 'تم إرسال الدعوة بنجاح!'}
                </h3>
                <p className="text-sm text-secondary/60">
                  {dir === 'ltr' ? 'Here are the details of the sent invitation:' : 'إليك تفاصيل الدعوة المرسلة:'}
                </p>
              </div>

              <div className="space-y-4 border-t border-secondary/15 pt-4">
                <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium">{dir === 'ltr' ? 'Reference Code' : 'رمز الدعوة'}</span>
                  <span className="font-mono font-bold text-secondary">{sentInvitationData.reference_code}</span>
                </div>
                <div className="flex justify-between items-start gap-4 py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium shrink-0">{dir === 'ltr' ? 'Event Name' : 'اسم الحفل'}</span>
                  <span className="font-bold text-secondary text-end">{sentInvitationData.name || (sentInvitationData.event && sentInvitationData.event.name)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium">{dir === 'ltr' ? 'Status' : 'حالة الدعوة'}</span>
                  <span className="font-bold text-secondary bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs">
                    {sentInvitationData.status_label || (dir === 'ltr' ? 'Sent' : 'مرسلة')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium">{dir === 'ltr' ? 'Guests Count' : 'عدد المدعوين'}</span>
                  <span className="font-mono font-bold text-secondary">{sentInvitationData.guest_count}</span>
                </div>
                {sentInvitationData.sent_at && (
                  <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                    <span className="text-secondary/60 font-medium">{dir === 'ltr' ? 'Sent At' : 'تاريخ الإرسال'}</span>
                    <span className="font-mono font-bold text-secondary">
                      {new Date(sentInvitationData.sent_at).toLocaleString(dir === 'rtl' ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}
                {sentInvitationData.design_url && (
                  <div className="flex flex-col gap-2 py-2">
                    <span className="text-secondary/60 font-medium text-sm">{dir === 'ltr' ? 'Design' : 'تصميم الدعوة'}</span>
                    <div className="w-full h-40 relative rounded-2xl overflow-hidden border border-secondary/10 bg-secondary/5 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sentInvitationData.design_url}
                        alt="Invitation design"
                        className="object-contain max-h-full max-w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSentInvitationData(null)}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer"
              >
                {dir === 'ltr' ? 'Dismiss' : 'إغلاق'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
