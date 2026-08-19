import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguage } from '@/lib/i18n';
import { Invitation } from './InvitationsClient';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, Eye, Clock, Send, MousePointerClick,
  MoreHorizontal, ArrowLeft, ArrowRight, Edit2, Ticket, Users,
  Settings, ImageIcon, QrCode, UploadCloud, PieChart as PieChartIcon,
  BarChart3, Calendar, AlertCircle, Search, SortDesc, User, Loader2,
  ChevronLeft, ChevronRight, ShieldOff, UserPlus, FileSpreadsheet, Trash2,
  RefreshCw, Upload, X as XIcon, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, Tooltip, Legend, BarChart, CartesianGrid, XAxis, YAxis, Bar } from 'recharts';
import { ConfirmModal } from './ConfirmModal';
import { GuestFormModal, type GuestFormValues } from './GuestFormModal';
import { GuestImportModal } from './GuestImportModal';
import { CheckInWelcomeCard } from './CheckInWelcomeCard';
import { ReplacementSendModal } from './ReplacementSendModal';
import {
  getInvitationById,
  getInvitationGuests,
  deleteInvitationGuest,
  sendInvitation,
  replaceInvitationDesign,
  updateInvitation,
  getAdminServiceOrderById,
  isInvitationOverageError,
  type InvitationDetailData,
  type InvitationGuest as ApiInvitationGuest,
  type SendInvitationResult,
  type InvitationOverageError,
  type ApiServiceOrderDetail,
} from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

/** `"18:00"` → minutes since midnight, or null when unparseable. */
function toMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

interface InlineEditFormValues {
  logic: 'strict' | 'default_accept' | 'view_only';
  deadlineDate: string;
  deadlineTime: string;
}

export type InvitationGuestStatus = 'pending' | 'accepted' | 'declined';

/** Backend limit for the invitation design image. */
const MAX_DESIGN_BYTES = 10 * 1024 * 1024;
const DESIGN_ACCEPT = 'image/png,image/jpeg,image/webp';

export interface InvitationGuest {
  id: string;
  name: string;
  phone: string;
  status: InvitationGuestStatus;
  have_whatsapp?: boolean;
}

interface CheckIn {
  id: string;
  guestName: string;
  phoneNumber: string;
  checkInTime: string;
}

export function AttendanceDetails({ onBack, attendanceNumber, employeeName }: { onBack: () => void; attendanceNumber: number; employeeName?: string }) {
  const { t, dir } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // The API exposes attendance as counts only (`attendance.checked_in`) — there
  // is no per-guest check-in endpoint yet, so the list stays empty until one
  // exists rather than showing invented rows.
  const [checkIns] = useState<CheckIn[]>([]);

  const filteredAndSortedCheckIns = useMemo(() => {
    const result = checkIns.filter(c =>
      c.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phoneNumber.includes(searchTerm)
    );

    result.sort((a, b) => {
      const dateA = new Date(a.checkInTime).getTime();
      const dateB = new Date(b.checkInTime).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [checkIns, searchTerm, sortOrder]);

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
          {t('attendanceDetails')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <QrCode className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-secondary/60 text-sm">{t('attendanceNumber')}</p>
            <p className="text-xl font-bold text-secondary">{attendanceNumber}</p>
          </div>
        </div>
        <div className="glass-panel p-6 rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <p className="text-secondary/60 text-sm">{t('assignedEmployee')}</p>
            <p className="text-xl font-bold text-secondary">{employeeName || '-'}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-3xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <h3 className="text-lg font-semibold text-secondary flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            {t('qrCheckIns')}
          </h3>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40", dir === 'ltr' ? 'left-3' : 'right-3')} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('searchGuestOrPhone')}
                className={cn(
                  "w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2 transition-all outline-none text-secondary text-sm",
                  dir === 'ltr' ? 'pl-9 pr-4' : 'pr-9 pl-4'
                )}
              />
            </div>
            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="p-2 border border-secondary/10 bg-white/50 rounded-xl hover:bg-white/80 transition-colors flex items-center gap-2 text-secondary text-sm font-medium shrink-0 cursor-pointer"
              title={t('sortByTime')}
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
              {t('noCheckInsFound')}
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
  onEdit?: (invitation: Invitation) => void;
}

export function InvitationDetails({ invitation, onBack, onEdit }: InvitationDetailsProps) {
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
  const [sentInvitationData, setSentInvitationData] = useState<SendInvitationResult | null>(null);
  // Set when the API rejects the send because guests exceed the package allowance.
  const [overageInfo, setOverageInfo] = useState<InvitationOverageError | null>(null);
  // Replacement send — spends the credit earned from rejections on new guests.
  const [replacementOpen, setReplacementOpen] = useState(false);
  /**
   * The selection that hit an overage 422, kept so the "send anyway" retry stays
   * a replacement send instead of silently falling back to a full fan-out.
   */
  const [pendingGuestIds, setPendingGuestIds] = useState<number[] | null>(null);

  const [detail, setDetail] = useState<InvitationDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  // Design replacement (hover overlay on the design card)
  const designInputRef = useRef<HTMLInputElement>(null);
  const [designUploading, setDesignUploading] = useState(false);

  // Guest add / edit / import / delete
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [guestBeingEdited, setGuestBeingEdited] = useState<GuestFormValues | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [guestToDelete, setGuestToDelete] = useState<InvitationGuest | null>(null);

  const [guests, setGuests] = useState<InvitationGuest[]>([]);
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestPage, setGuestPage] = useState(1);
  const [guestTotalPages, setGuestTotalPages] = useState(1);

  // ── Inline edit state ───────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  // Quick logic picker in the read-only panel (no need to open full edit mode)
  const [quickLogic, setQuickLogic] = useState<'strict' | 'default_accept' | 'view_only'>('strict');
  const [logicQuickSaving, setLogicQuickSaving] = useState(false);

  const [editOrder, setEditOrder] = useState<ApiServiceOrderDetail | null>(null);
  // File upload for design inside the inline edit panel
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editFileName, setEditFileName] = useState('');
  const [editFileError, setEditFileError] = useState<string | null>(null);
  // Date picker
  const [editShowDatePicker, setEditShowDatePicker] = useState(false);
  const editDatePickerRef = useRef<HTMLDivElement>(null);

  const editSchema = React.useMemo(() => z.object({
    logic: z.enum(['strict', 'default_accept', 'view_only']),
    deadlineDate: z.string().min(1, { message: dir === 'ltr' ? 'Please select a deadline date' : 'يرجى اختيار تاريخ الموعد النهائي' }),
    deadlineTime: z.string().min(1, { message: dir === 'ltr' ? 'Please select a deadline time' : 'يرجى اختيار وقت الموعد النهائي' }),
  }), [dir]);

  const editForm = useForm<InlineEditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { logic: 'strict', deadlineDate: '', deadlineTime: '' },
  });

  const editDeadlineDateValue = editForm.watch('deadlineDate');
  const editEventDate = editOrder?.event_date ?? undefined;
  const editEventStartMinutes = editOrder?.event_time ? toMinutes(editOrder.event_time) : null;
  const editSelectedDate = editDeadlineDateValue ? new Date(editDeadlineDateValue) : undefined;

  // Close datepicker on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (editDatePickerRef.current && !editDatePickerRef.current.contains(e.target as Node)) {
        setEditShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);


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

  /** Populate the inline-edit form whenever detail data arrives / refreshes. */
  useEffect(() => {
    if (!detail) return;
    const parseApiDate = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } catch { return ''; }
    };
    const d = detail.details;
    const resolvedLogic = (d.logic_type === 'strict_action' ? 'strict' : d.logic_type ?? 'strict') as 'strict' | 'default_accept' | 'view_only';
    editForm.reset({
      logic: resolvedLogic,
      deadlineDate: parseApiDate(d.deadline_date),
      deadlineTime: d.deadline_time || '',
    });
    // Also sync the quick-logic picker so it always reflects server state
    setQuickLogic(resolvedLogic);
    // Also fetch the service order for the date ceiling, if not yet loaded.
    if (detail.service_order_id != null && !editOrder) {
      getAdminServiceOrderById(detail.service_order_id, token)
        .then(res => setEditOrder(res.data))
        .catch(() => {/* non-fatal */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);


  const editGetMinAllowedDate = () => {
    const today = new Date(); today.setHours(0, 0, 0, 0); return today;
  };
  const editGetMaxAllowedDate = () => {
    if (!editEventDate) return undefined;
    const d = new Date(editEventDate);
    if (isNaN(d.getTime())) return undefined;
    d.setHours(0, 0, 0, 0); return d;
  };
  const editGetDisabledDays = () => {
    const minDate = editGetMinAllowedDate();
    const maxDate = editGetMaxAllowedDate();
    return maxDate ? { before: minDate, after: maxDate } : { before: minDate };
  };

  const MAX_EDIT_DESIGN_BYTES = 10 * 1024 * 1024;
  const acceptEditFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setEditFileError(dir === 'ltr' ? 'The design must be an image' : 'يجب أن يكون التصميم صورة');
      return;
    }
    if (file.size > MAX_EDIT_DESIGN_BYTES) {
      setEditFileError(dir === 'ltr' ? 'Maximum size is 10MB' : 'أقصى حجم 10 ميجابايت');
      return;
    }
    setEditSelectedFile(file);
    setEditFileName(file.name);
    setEditFileError(null);
  };

  const onSubmitInline = async (values: InlineEditFormValues) => {
    if (editSubmitting) return;
    setEditFileError(null);

    // Same-day deadline must be before event start time
    if (editOrder?.event_date && editEventStartMinutes != null) {
      const parseApiDate = (ds: string) => {
        try { const d = new Date(ds); return isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } catch { return ''; }
      };
      const eventDay = parseApiDate(editOrder.event_date);
      const deadlineMinutes = toMinutes(values.deadlineTime);
      if (eventDay && values.deadlineDate === eventDay && deadlineMinutes != null && deadlineMinutes >= editEventStartMinutes) {
        editForm.setError('deadlineTime', {
          message: dir === 'ltr' ? 'The deadline must be before the event starts' : 'يجب أن يكون الموعد النهائي قبل بداية المناسبة',
        });
        return;
      }
    }

    const mappedLogic = values.logic === 'strict' ? 'strict_action' : values.logic;
    setEditSubmitting(true);
    const saveToast = toast.loading(dir === 'ltr' ? 'Saving changes...' : 'جاري الحفظ...');
    try {
      const res = await updateInvitation(
        Number(invitation.id),
        {
          logic_type: mappedLogic,
          deadline_date: values.deadlineDate,
          deadline_time: values.deadlineTime,
          design: editSelectedFile,
        },
        token
      );
      toast.dismiss(saveToast);
      toast.success(res.msg || (dir === 'ltr' ? 'Invitation updated successfully' : 'تم تحديث الدعوة بنجاح'));
      // Reset file state
      setEditSelectedFile(null);
      setEditFileName('');
      setIsEditing(false);
      await refreshDetails(false);
    } catch (err) {
      toast.dismiss(saveToast);
      toast.error((err as Error).message || (dir === 'ltr' ? 'An unexpected error occurred' : 'حدث خطأ غير متوقع'));
    } finally {
      setEditSubmitting(false);
    }
  };

  /**
   * Quick-save only the logic type from the read-only panel.
   * Keeps the existing deadline date/time so the user doesn't have to touch them.
   */
  const handleQuickLogicSave = async () => {
    if (logicQuickSaving || !detail) return;
    const existingLogic = (detail.details.logic_type === 'strict_action' ? 'strict' : detail.details.logic_type ?? 'strict') as 'strict' | 'default_accept' | 'view_only';
    if (quickLogic === existingLogic) return;
    setLogicQuickSaving(true);
    const saveToast = toast.loading(dir === 'ltr' ? 'Saving...' : 'جاري الحفظ...');
    try {
      const mappedLogic = quickLogic === 'strict' ? 'strict_action' : quickLogic;
      const res = await updateInvitation(
        Number(invitation.id),
        {
          logic_type: mappedLogic,
          deadline_date: detail.details.deadline_date,
          deadline_time: detail.details.deadline_time || '',
        },
        token
      );
      toast.dismiss(saveToast);
      toast.success(res.msg || (dir === 'ltr' ? 'Logic updated' : 'تم تحديث المنطق'));
      await refreshDetails(false);
    } catch (err) {
      toast.dismiss(saveToast);
      toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to update' : 'فشل التحديث'));
      setQuickLogic(existingLogic); // revert picker on error
    } finally {
      setLogicQuickSaving(false);
    }
  };

  /**
   * Sends the invitation. Without `guestIds` this is the first send and the API
   * fans out to every not-yet-messaged guest; with them it is a replacement send
   * that spends one credit per guest.
   *
   * When the guest count exceeds the package allowance the API replies 422 with
   * `requires_confirmation`; that is surfaced as a second confirmation which
   * retries with `force_overage=1` — carrying the same selection.
   *
   * Resolves `false` only for failures the caller should react to; the overage
   * case resolves `true` because the flow continues in its own confirmation.
   */
  const handleSendInvitation = async (
    { forceOverage = false, guestIds }: { forceOverage?: boolean; guestIds?: number[] } = {}
  ): Promise<boolean> => {
    if (!token || !invitation.id) return false;
    setShowSendConfirm(false);
    if (forceOverage) setOverageInfo(null);

    const sendToast = toast.loading(t('sendingInvitation'));
    setIsSending(true);
    try {
      const res = await sendInvitation(Number(invitation.id), token, { forceOverage, guestIds });
      toast.dismiss(sendToast);
      toast.success(res.msg || t('invitationSentSuccess'));
      setSentInvitationData(res.data);
      setPendingGuestIds(null);
      await refreshDetails(false);
      return true;
    } catch (err) {
      toast.dismiss(sendToast);
      if (isInvitationOverageError(err)) {
        setPendingGuestIds(guestIds ?? null);
        setOverageInfo(err.data);
        return true;
      }
      // Replacement rejections (no credit left, too many guests, ineligible ids)
      // arrive as plain 422s — the API's own Arabic `msg` is the message.
      toast.error((err as Error).message || t('invitationSendFailed'));
      await refreshDetails(false);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Replaces the invitation design through the invitation-scoped endpoint
   * (`POST /admin/invitations/:id/upload-design`, multipart `design`). The
   * detail payload is refetched afterwards so `design.design_url` — and the
   * cache-busting query the backend puts on it — comes from the server rather
   * than from a locally guessed URL.
   */
  const handleDesignSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-picking the same file after a failure.
    e.target.value = '';
    if (!file || !token) return;

    // Mirrors the backend's `image/*` + 10MB rule so a bad file fails locally.
    if (!file.type.startsWith('image/')) {
      toast.error(t('designMustBeImage'));
      return;
    }
    if (file.size > MAX_DESIGN_BYTES) {
      toast.error(t('designTooLarge'));
      return;
    }

    setDesignUploading(true);
    try {
      const res = await replaceInvitationDesign(Number(invitation.id), file, token);
      toast.success(res.msg || t('designUploaded'));
      await refreshDetails(false);
    } catch (err) {
      toast.error((err as Error).message || t('designUploadFailed'));
    } finally {
      setDesignUploading(false);
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

    setGuestLoading(true);
    try {
      const apiStatus = guestStatusFilter === 'all' ? undefined : (guestStatusFilter === 'declined' ? 'rejected' : guestStatusFilter);
      // Guests hang off the invitation itself — no order or event id is sent.
      const res = await getInvitationGuests(Number(invitation.id), {
        page: guestPage,
        per_page: 15,
        keyword: debouncedGuestSearch || undefined,
        status: apiStatus,
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
  }, [token, invitation.id, guestPage, debouncedGuestSearch, guestStatusFilter]);

  const handleDeleteGuest = async () => {
    if (!guestToDelete || !token) return;
    const deleteToast = toast.loading(t('deletingGuest'));
    try {
      await deleteInvitationGuest(Number(invitation.id), Number(guestToDelete.id), token);
      toast.dismiss(deleteToast);
      toast.success(t('guestDeleted'));
      // Refetch rather than splice — the guest count and pagination both move.
      fetchGuests();
      refreshDetails();
    } catch (err) {
      toast.dismiss(deleteToast);
      toast.error((err as Error).message || t('guestDeleteFailed'));
    } finally {
      setGuestToDelete(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'guests') {
      fetchGuests();
    }
  }, [activeTab, fetchGuests]);

  const isPastEvent = detail ? detail.actions.status === 'previous' : invitation.status === 'past';
  const hasGuests = guests.length > 0 || debouncedGuestSearch !== '' || guestStatusFilter !== 'all' || guestLoading;

  /*
   * Sending is gated by one flag — `actions.can_be_sent`. It already folds in the
   * deadline, payment, barcode suspension, remaining credit and whether anyone is
   * left to message, so it is never recomputed here.
   *
   * The two counters below only decide *which* send is offered:
   *   • `unsent_whatsapp_guests_count` — guests never messaged (usually added
   *     after the first send). Sending to them is free, so `can_be_sent` can be
   *     true while the replacement credit is 0.
   *   • `available_resends` — credit earned from rejections, spent by picking
   *     replacement guests. Reported on both blocks of the payload; read either.
   */
  const availableResends =
    detail?.actions.available_resends ?? detail?.response_stats.available_resends;
  const resendCredit = availableResends ?? 0;
  const supportsReplacementSend = availableResends !== undefined;
  const isSent = detail?.actions.is_sent ?? false;
  const canBeSent = detail?.actions.can_be_sent ?? false;
  const isBarcodeSuspended = detail?.is_barcode_suspended ?? invitation.isBarcodeSuspended;

  const unsentGuestCount = detail?.actions.unsent_whatsapp_guests_count;
  // `undefined` means the API does not report the counter — then a plain send is
  // the only thing we can safely offer, so treat it as available.
  const hasUnsentGuests = unsentGuestCount === undefined ? true : unsentGuestCount > 0;
  /** Bodyless send — fans out to every not-yet-messaged guest, no credit spent. */
  const canSendToUnsent = canBeSent && !isBarcodeSuspended && hasUnsentGuests;
  /** Replacement send — needs credit and the picker. */
  const canSendReplacement =
    canBeSent && !isBarcodeSuspended && isSent && supportsReplacementSend && resendCredit > 0;

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
      />
    );
  }

  const getGuestStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending': return { icon: Clock, label: t('pending'), color: 'text-amber-500 bg-amber-50 ring-amber-500/20' };
      case 'accepted': return { icon: CheckCircle2, label: t('accepted'), color: 'text-emerald-500 bg-emerald-50 ring-emerald-500/20' };
      case 'declined': return { icon: XCircle, label: t('declined'), color: 'text-red-600 bg-red-50 ring-red-500/20' };
      default: return { icon: MoreHorizontal, label: status, color: 'text-gray-500 bg-gray-50 ring-gray-500/20' };
    }
  };

  const attendanceData = detail ? [
    {
      name: t('attendance'),
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
                  {invitation.serviceOrderReference}
                </h2>
                <span className="px-2.5 py-1 text-xs font-medium bg-secondary/5 text-secondary/60 rounded-lg font-mono">
                  {invitation.id}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle inline edit — follows the API's own capability flag. */}
          {(detail ? detail.actions.can_be_edited : !isPastEvent) && (
            <button
              onClick={() => setIsEditing(v => !v)}
              className={cn(
                "p-2 sm:p-2 border border-transparent rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer w-11 h-11 shrink-0",
                isEditing
                  ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                  : "bg-white text-yellow-500 hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0"
              )}
            >
              {isEditing ? <XIcon className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
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
            {t('invitationInfo')}
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={cn(
              "p-2.5 sm:px-6 rounded-xl text-sm font-medium transition-all",
              activeTab === 'guests' ? "bg-white text-secondary shadow-sm" : "text-secondary/60 hover:text-secondary hover:bg-white/50"
            )}
          >
            {t('guests')}
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
                      {t('details')}
                    </h3>

                    {/* ── Read-only view ── */}
                    {!isEditing && (
                      <div className="space-y-4">
                        <div className="p-4 bg-white/40 rounded-2xl flex items-center justify-between border border-secondary/5">
                          <div className="flex items-center gap-3 text-secondary/60">
                            <Calendar className="w-5 h-5" />
                            <span className="text-sm">{t('deadline')}</span>
                          </div>
                          <span className="font-medium text-secondary">{detail?.details.deadline_date || invitation.deadlineDate}</span>
                        </div>
                        <div className="p-4 bg-white/40 rounded-2xl flex items-center justify-between border border-secondary/5">
                          <div className="flex items-center gap-3 text-secondary/60">
                            <Users className="w-5 h-5" />
                            <span className="text-sm">{t('numOfGuests')}</span>
                          </div>
                          <span className="font-medium text-secondary">
                            {detail?.details.guest_count || invitation.guestsNumber}
                            {/* Show the package allowance so overage is visible before sending */}
                            {(detail?.guests_included ?? invitation.guestsIncluded) != null && (
                              <span className={cn(
                                'ms-1.5 text-xs font-bold',
                                (detail?.details.guest_count || invitation.guestsNumber) >
                                  (detail?.guests_included ?? invitation.guestsIncluded ?? Infinity)
                                  ? 'text-amber-600'
                                  : 'text-secondary/40'
                              )}>
                                / {detail?.guests_included ?? invitation.guestsIncluded}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Logic row — compact inline picker in read-only mode */}
                        <div className="p-4 bg-white/40 rounded-2xl border border-secondary/5 space-y-3">
                          <div className="flex items-center gap-3 text-secondary/60">
                            <Settings className="w-5 h-5" />
                            <span className="text-sm">{t('logic')}</span>
                          </div>
                          {/* 3-segment picker */}
                          <div className="flex gap-1.5">
                            {([
                              { value: 'strict',         label: dir === 'ltr' ? 'Strict'  : 'صارم' },
                              { value: 'default_accept', label: dir === 'ltr' ? 'Accept'  : 'تلقائي' },
                              { value: 'view_only',      label: dir === 'ltr' ? 'View'    : 'عرض' },
                            ] as const).map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                disabled={logicQuickSaving || !detail?.actions.can_be_edited}
                                onClick={() => setQuickLogic(opt.value)}
                                className={cn(
                                  'flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all border',
                                  quickLogic === opt.value
                                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                                    : 'bg-white/60 text-secondary/60 border-secondary/15 hover:bg-white hover:text-secondary hover:border-secondary/30',
                                  'disabled:opacity-40 disabled:cursor-not-allowed'
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          {/* Save button — only shown when the value differs from the server */}
                          {quickLogic !== ((detail?.details.logic_type === 'strict_action' ? 'strict' : detail?.details.logic_type ?? 'strict') as string) && (
                            <button
                              type="button"
                              onClick={handleQuickLogicSave}
                              disabled={logicQuickSaving}
                              className="w-full py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-primary/20 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {logicQuickSaving
                                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{dir === 'ltr' ? 'Saving...' : 'جاري الحفظ...'}</>
                                : <><Check className="w-3.5 h-3.5" />{dir === 'ltr' ? 'Save Logic' : 'حفظ المنطق'}</>
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Inline edit form ── */}
                    {isEditing && (
                      <Form {...editForm}>
                        <form onSubmit={editForm.handleSubmit(onSubmitInline)} className="space-y-5">
                          {/* Logic type */}
                          <FormField
                            control={editForm.control}
                            name="logic"
                            render={({ field }) => (
                              <FormItem className="space-y-2">
                                <FormLabel className="block text-sm font-medium text-secondary/80">
                                  {dir === 'ltr' ? 'Invitation Logic' : 'منطق الدعوة'} <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="space-y-2">
                                    {([
                                      { value: 'strict', label: dir === 'ltr' ? 'Strict Action' : 'إجراء صارم', desc: dir === 'ltr' ? 'If no response, recorded as declined.' : 'إذا لم يتم الرد، تسجل كمرفوضة.' },
                                      { value: 'default_accept', label: dir === 'ltr' ? 'Default Accept' : 'قبول تلقائي', desc: dir === 'ltr' ? 'If no response, recorded as accepted.' : 'إذا لم يتم الرد، تسجل كمقبولة.' },
                                      { value: 'view_only', label: dir === 'ltr' ? 'View Only' : 'للعرض فقط', desc: dir === 'ltr' ? 'Accepted right away, for informing only.' : 'تقبل فوراً، للعلم بالخبر فقط.' },
                                    ] as const).map(opt => (
                                      <label key={opt.value} className={cn(
                                        "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                                        field.value === opt.value ? 'border-primary/50 bg-primary/5' : 'border-secondary/20 bg-white/50 hover:bg-white/80'
                                      )}>
                                        <input
                                          type="radio"
                                          value={opt.value}
                                          checked={field.value === opt.value}
                                          onChange={() => field.onChange(opt.value)}
                                          className="mt-1 w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                                        />
                                        <div>
                                          <span className="block text-sm font-medium text-secondary">{opt.label}</span>
                                          <span className="block text-xs text-secondary/60 mt-0.5">{opt.desc}</span>
                                        </div>
                                      </label>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Deadline date */}
                          <FormField
                            control={editForm.control}
                            name="deadlineDate"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-medium text-secondary/80 flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-secondary/50" />
                                  {dir === 'ltr' ? 'Deadline Date' : 'تاريخ الموعد النهائي'} <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <div className="relative" ref={editDatePickerRef}>
                                    <button
                                      type="button"
                                      onClick={() => setEditShowDatePicker(v => !v)}
                                      className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-2.5 text-start text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all flex justify-between items-center cursor-pointer text-sm"
                                    >
                                      <span>{field.value || (dir === 'ltr' ? 'Select date...' : 'اختر التاريخ...')}</span>
                                      <Calendar className="w-4 h-4 text-secondary/50 shrink-0" />
                                    </button>
                                    {editShowDatePicker && (
                                      <div className="absolute z-[60] mt-2 p-3 bg-white border border-secondary/15 rounded-2xl shadow-xl left-0 rtl:right-0">
                                        <DayPicker
                                          mode="single"
                                          selected={editSelectedDate}
                                          onSelect={(date) => {
                                            if (!date) return;
                                            const yyyy = date.getFullYear();
                                            const mm = String(date.getMonth() + 1).padStart(2, '0');
                                            const dd = String(date.getDate()).padStart(2, '0');
                                            field.onChange(`${yyyy}-${mm}-${dd}`);
                                            setEditShowDatePicker(false);
                                          }}
                                          disabled={editGetDisabledDays()}
                                          locale={dir === 'rtl' ? ar : undefined}
                                          dir={dir}
                                        />
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Deadline time */}
                          <FormField
                            control={editForm.control}
                            name="deadlineTime"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-sm font-medium text-secondary/80 flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-secondary/50" />
                                  {dir === 'ltr' ? 'Deadline Time' : 'وقت الموعد النهائي'} <span className="text-red-500">*</span>
                                </FormLabel>
                                <FormControl>
                                  <select
                                    {...field}
                                    className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary cursor-pointer text-sm"
                                  >
                                    <option value="">{dir === 'ltr' ? 'Select time...' : 'اختر الوقت...'}</option>
                                    {Array.from({ length: 24 }, (_, h) => {
                                      const period = h < 12 ? (dir === 'rtl' ? 'ص' : 'AM') : (dir === 'rtl' ? 'م' : 'PM');
                                      const hour12 = h % 12 === 0 ? 12 : h % 12;
                                      const label = `${String(hour12).padStart(2, '0')}:00 ${period}`;
                                      const value = `${String(h).padStart(2, '0')}:00`;
                                      return <option key={value} value={value}>{label}</option>;
                                    })}
                                  </select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Design upload */}
                          <div>
                            <label className="block text-sm font-medium text-secondary/80 mb-1.5">
                              {dir === 'ltr' ? 'Upload Design' : 'رفع التصميم'}
                            </label>
                            <div
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) acceptEditFile(f); }}
                              onClick={() => editFileInputRef.current?.click()}
                              className={cn(
                                "w-full border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/30",
                                editFileError
                                  ? "border-red-500 bg-red-50/20 hover:bg-red-50/30"
                                  : "border-secondary/20 hover:bg-white/50 hover:border-primary/30"
                              )}
                            >
                              <input
                                type="file"
                                ref={editFileInputRef}
                                className="hidden"
                                accept=".png,.jpg,.jpeg,.webp"
                                onChange={e => { const f = e.target.files?.[0]; if (f) acceptEditFile(f); }}
                              />
                              <Upload className="w-6 h-6 text-secondary/40 mb-2" />
                              <p className="text-sm font-medium text-secondary">
                                {editFileName || (dir === 'ltr' ? 'Upload New Design' : 'رفع تصميم جديد')}
                              </p>
                              <p className="text-xs text-secondary/50 mt-0.5">
                                {dir === 'ltr' ? 'PNG, JPG, WEBP up to 10MB' : 'أقصى حجم 10 ميجابايت (PNG, JPG, WEBP)'}
                              </p>
                            </div>
                            {editFileError && (
                              <p className="text-xs text-red-500 mt-1.5">{editFileError}</p>
                            )}
                          </div>

                          {/* Save / Cancel */}
                          <div className="flex gap-2 pt-2 border-t border-secondary/10">
                            <button
                              type="button"
                              onClick={() => { setIsEditing(false); setEditSelectedFile(null); setEditFileName(''); setEditFileError(null); }}
                              disabled={editSubmitting}
                              className="flex-1 px-4 py-2.5 rounded-xl border border-secondary/20 bg-white/50 text-secondary hover:bg-white/80 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {dir === 'ltr' ? 'Cancel' : 'إلغاء'}
                            </button>
                            <button
                              type="submit"
                              disabled={editSubmitting}
                              className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 rounded-xl text-sm font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                            >
                              {editSubmitting ? (
                                <><Loader2 className="w-4 h-4 animate-spin" />{dir === 'ltr' ? 'Saving...' : 'جاري الحفظ...'}</>
                              ) : (
                                <><Check className="w-4 h-4" />{dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات'}</>
                              )}
                            </button>
                          </div>
                        </form>
                      </Form>
                    )}

                    <div className="mt-6 flex flex-col gap-3">
                      {/* Sending is blocked while the barcode is suspended */}
                      {isBarcodeSuspended && (
                        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200">
                          <ShieldOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-bold text-rose-700">
                              {t('barcodeSuspended')}
                            </p>
                            <p className="text-xs text-rose-600/80 mt-0.5">
                              {t('barcodeSuspendedHint')}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Guests added after the first send — free to message. */}
                      {isSent && unsentGuestCount != null && unsentGuestCount > 0 && (
                        <div className="flex items-center gap-2.5 p-3 rounded-2xl border bg-white/40 border-secondary/10">
                          <UserPlus className="w-4 h-4 shrink-0 text-secondary/50" />
                          <span className="text-sm text-secondary/70">{t('guestsAwaitingSend')}</span>
                          <span className="ms-auto text-base font-bold text-secondary">{unsentGuestCount}</span>
                        </div>
                      )}

                      {/* Replacement credit — one per rejection, only ever after a send. */}
                      {isSent && resendCredit > 0 && (
                        <div className="flex items-center gap-2.5 p-3 rounded-2xl border bg-primary/5 border-primary/20">
                          <RefreshCw className="w-4 h-4 shrink-0 text-primary" />
                          <span className="text-sm text-secondary/70">{t('availableResends')}</span>
                          <span className="ms-auto text-base font-bold text-primary">{resendCredit}</span>
                        </div>
                      )}

                      {/*
                        Both buttons hang off `can_be_sent`; the counters only pick
                        which of them is on offer. A bodyless send goes to every
                        not-yet-messaged guest and spends no credit, so it stays
                        available after the first send whenever such guests exist.
                      */}
                      {canSendToUnsent && (
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
                          {isSent && unsentGuestCount != null
                            ? `${t('sendToNewGuests')} (${unsentGuestCount})`
                            : t('sendInvitation')}
                        </button>
                      )}

                      {canSendReplacement && (
                        <button
                          onClick={() => setReplacementOpen(true)}
                          disabled={isSending}
                          className={cn(
                            'w-full py-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                            // Demoted to secondary when the free send is also on
                            // offer, so the cheaper action reads as the primary one.
                            canSendToUnsent
                              ? 'bg-white text-primary border border-primary/30 hover:bg-primary/5 shadow-sm'
                              : 'bg-gradient-to-r from-primary to-primary-light text-white shadow-xl shadow-primary/30'
                          )}
                        >
                          {isSending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-5 h-5" />
                          )}
                          {t('sendReplacementInvitations')}
                        </button>
                      )}

                      {/* Sent, but the API says no send is possible — name the
                          reason instead of showing a dead button. */}
                      {isSent && !canBeSent && !isBarcodeSuspended && (
                        <p className="text-xs text-secondary/50 text-center">
                          {supportsReplacementSend && resendCredit === 0
                            ? t('noReplacementsAvailable')
                            : t('noEligibleGuests')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Venue welcome screen — only offered once the backend
                      exposes the block (barcode invitations). */}
                  {detail?.check_in_display && (
                    <CheckInWelcomeCard
                      invitationId={Number(invitation.id)}
                      display={detail.check_in_display}
                      invitationName={detail.name || invitation.serviceOrderReference}
                      token={token}
                      onSaved={setDetail}
                    />
                  )}

                  <div className="glass-panel p-6 rounded-3xl hidden lg:block">
                    <h3 className="font-semibold text-secondary mb-4 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-primary" />
                      {t('designImage')}
                    </h3>
                    <input
                      ref={designInputRef}
                      type="file"
                      accept={DESIGN_ACCEPT}
                      onChange={handleDesignSelected}
                      className="hidden"
                    />
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
                          <h4 className="text-2xl font-serif text-stone-800 mb-2">{invitation.serviceOrderReference}</h4>
                          <p className="text-stone-500 text-sm mb-8 font-medium">{t('youAreCordiallyInvited')}</p>
                          <div className="mt-auto bg-white p-3 rounded-xl shadow-sm border border-stone-200">
                            <QrCode className="w-24 h-24 text-stone-800" />
                          </div>
                        </div>
                      )}

                      <AnimatePresence>
                        {/* Kept mounted while uploading so the spinner stays
                            visible even after the pointer leaves the card. */}
                        {(isDesignHovered || designUploading) && detail?.design.can_be_changed && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
                          >
                            <button
                              type="button"
                              onClick={() => designInputRef.current?.click()}
                              disabled={designUploading}
                              className="px-5 py-2.5 bg-white text-secondary rounded-xl font-medium shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-wait disabled:hover:scale-100"
                            >
                              {designUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UploadCloud className="w-4 h-4" />
                              )}
                              {designUploading ? t('designUploading') : t('replaceDesign')}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard title={t('totalSent')} value={detail?.response_stats.total_sent.count || 0} icon={Send} colorClass="bg-blue-100 text-blue-600" />
                    <StatCard title={t('accepted')} value={detail?.response_stats.accepted.count || 0} icon={CheckCircle2} colorClass="bg-emerald-100 text-emerald-600" subtitle={detail ? `${detail.response_stats.accepted.percentage}%` : ''} />
                    <StatCard title={t('declined')} value={detail?.response_stats.rejected.count || 0} icon={XCircle} colorClass="bg-red-100 text-red-600" subtitle={detail ? `${detail.response_stats.rejected.percentage}%` : ''} />
                    <StatCard title={t('pending')} value={detail?.response_stats.pending.count || 0} icon={Clock} colorClass="bg-amber-100 text-amber-600" subtitle={detail ? `${detail.response_stats.pending.percentage}%` : ''} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Attendance Bar Chart */}
                    <div className="glass-panel p-6 rounded-3xl h-[300px] flex flex-col md:col-span-2">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-secondary flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          {t('eventAttendance')}
                        </h3>
                        {isPastEvent && (
                          <button
                            onClick={() => setShowAttendanceDetails(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/40 hover:bg-white/60 transition-colors rounded-lg text-xs font-medium text-secondary shadow-sm ring-1 ring-secondary/5 cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            {t('qrCheckIns')}
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
                              <Bar dataKey="Attended" fill="#10b981" radius={[4, 4, 0, 0]} barSize={80} name={t('attended')} />
                              <Bar dataKey="NotAttended" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={80} name={t('didntAttend')} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-secondary/10 rounded-2xl bg-white/30">
                          <Calendar className="w-12 h-12 text-secondary/30 mb-3" />
                          <p className="text-secondary/60 font-medium">{t('statsAvailableAfterEvent')}</p>
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
                  <h3 className="text-xl font-bold text-secondary mb-3">{t('noGuestsFound')}</h3>
                  <p className="text-secondary/60 max-w-sm mb-8">
                    {t('noGuestsAddedYet')}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={() => { setGuestBeingEdited(null); setGuestFormOpen(true); }}
                      className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium shadow-md shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      {t('addGuest')}
                    </button>
                    <button
                      onClick={() => setImportOpen(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-white text-secondary/70 border border-secondary/15 rounded-xl font-medium hover:bg-white/80 hover:text-secondary transition-all active:scale-95 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      {t('uploadSheet')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-4 sm:p-6 rounded-3xl">
                  {/* Guest actions — always available once the tab is populated */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <h3 className="text-sm font-bold text-secondary">
                      {t('guestList')}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setImportOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-secondary/70 border border-secondary/15 text-xs font-medium hover:text-secondary hover:bg-white/80 transition-colors cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {t('uploadSheet')}
                      </button>
                      <button
                        onClick={() => { setGuestBeingEdited(null); setGuestFormOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors cursor-pointer shadow-sm shadow-primary/20"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {t('addGuest')}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="relative w-full sm:w-[80%]">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40", dir === 'ltr' ? 'left-4' : 'right-4')} />
                      <input
                        type="text"
                        placeholder={t('searchByGuestNamePhone')}
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
                          <option value="all">{t('allStatuses')}</option>
                          <option value="accepted">{t('accepted')}</option>
                          <option value="declined">{t('declined')}</option>
                          <option value="pending">{t('pending')}</option>
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

                              <button
                                title={t('contactViaWhatsapp')}
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
                              <button
                                title={t('edit')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGuestBeingEdited({
                                    id: Number(guest.id),
                                    name: guest.name,
                                    // The list carries only a combined number —
                                    // the modal splits it on the dial code.
                                    countryCode: '',
                                    phone: guest.phone ?? '',
                                  });
                                  setGuestFormOpen(true);
                                }}
                                className="p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                title={t('delete')}
                                onClick={(e) => { e.stopPropagation(); setGuestToDelete(guest); }}
                                className="p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      !guestLoading && (
                        <div className="py-12 text-center text-secondary/40">
                          {t('noGuestsMatch')}
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

      {guestFormOpen && (
        <GuestFormModal
          invitationId={Number(invitation.id)}
          token={token}
          guest={guestBeingEdited}
          onClose={() => { setGuestFormOpen(false); setGuestBeingEdited(null); }}
          onSaved={() => { fetchGuests(); refreshDetails(); }}
        />
      )}

      {importOpen && (
        <GuestImportModal
          invitationId={Number(invitation.id)}
          token={token}
          onClose={() => setImportOpen(false)}
          onImported={() => { fetchGuests(); refreshDetails(); }}
        />
      )}

      <ConfirmModal
        isOpen={!!guestToDelete}
        onClose={() => setGuestToDelete(null)}
        onConfirm={handleDeleteGuest}
        title={t('deleteGuestTitle')}
        message={t('deleteGuestMessage')}
      />

      {replacementOpen && (
        <ReplacementSendModal
          invitationId={Number(invitation.id)}
          token={token}
          availableResends={resendCredit}
          onClose={() => setReplacementOpen(false)}
          onSubmit={(guestIds) => handleSendInvitation({ guestIds })}
        />
      )}

      <ConfirmModal
        isOpen={showSendConfirm}
        onClose={() => setShowSendConfirm(false)}
        onConfirm={() => handleSendInvitation()}
        title={isSent && unsentGuestCount != null ? t('sendToNewGuests') : t('confirmSendInvitation')}
        message={
          isSent && unsentGuestCount != null
            ? t('confirmSendToNewGuestsMessage').replace('{count}', String(unsentGuestCount))
            : t('confirmSendInvitationMessage')
        }
        confirmLabel={t('sendInvitation')}
        confirmColor="bg-primary hover:bg-primary-dark"
      />

      {/* Guest overage — the API asked for explicit confirmation before sending.
          The retry replays the same selection so a replacement send stays one. */}
      <ConfirmModal
        isOpen={!!overageInfo}
        onClose={() => { setOverageInfo(null); setPendingGuestIds(null); }}
        onConfirm={() => handleSendInvitation({ forceOverage: true, guestIds: pendingGuestIds ?? undefined })}
        title={t('guestLimitExceeded')}
        message={t('guestLimitExceededMessage')
          .replace('{count}', String(overageInfo?.guest_count ?? ''))
          .replace('{included}', String(overageInfo?.guests_included ?? ''))}
        confirmLabel={t('sendAnyway')}
        confirmColor="bg-amber-500 hover:bg-amber-600"
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
                  {sentInvitationData.is_replacement_send
                    ? t('replacementSentSuccess')
                    : t('invitationSentSuccess')}
                </h3>
                <p className="text-sm text-secondary/60">
                  {t('sentInvitationDetailsHint')}
                </p>
              </div>

              <div className="space-y-4 border-t border-secondary/15 pt-4">
                <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium">{t('referenceCode')}</span>
                  <span className="font-mono font-bold text-secondary">{sentInvitationData.reference_code}</span>
                </div>
                <div className="flex justify-between items-start gap-4 py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium shrink-0">{t('eventName')}</span>
                  <span className="font-bold text-secondary text-end">{sentInvitationData.name || (sentInvitationData.event && sentInvitationData.event.name)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium">{t('invitationStatus')}</span>
                  <span className="font-bold text-secondary bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs">
                    {sentInvitationData.status_label || t('invitationSentStatus')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                  <span className="text-secondary/60 font-medium">{t('guestsCount')}</span>
                  <span className="font-mono font-bold text-secondary">{sentInvitationData.guest_count}</span>
                </div>
                {/* Per-call counters — only reported by API builds with the resend feature */}
                {sentInvitationData.whatsapp_queued != null && (
                  <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                    <span className="text-secondary/60 font-medium">{t('whatsappQueued')}</span>
                    <span className="font-mono font-bold text-secondary">{sentInvitationData.whatsapp_queued}</span>
                  </div>
                )}
                {sentInvitationData.whatsapp_skipped != null && (
                  <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                    <span className="text-secondary/60 font-medium">{t('whatsappSkipped')}</span>
                    <span className="font-mono font-bold text-secondary/70">{sentInvitationData.whatsapp_skipped}</span>
                  </div>
                )}
                {sentInvitationData.available_resends != null && (
                  <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                    <span className="text-secondary/60 font-medium">{t('availableResends')}</span>
                    <span className="font-mono font-bold text-primary">{sentInvitationData.available_resends}</span>
                  </div>
                )}
                {sentInvitationData.sent_at && (
                  <div className="flex justify-between items-center py-2 border-b border-secondary/5 text-sm">
                    <span className="text-secondary/60 font-medium">{t('sentAt')}</span>
                    <span className="font-mono font-bold text-secondary">
                      {new Date(sentInvitationData.sent_at).toLocaleString(dir === 'rtl' ? 'ar-SA' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}
                {sentInvitationData.design_url && (
                  <div className="flex flex-col gap-2 py-2">
                    <span className="text-secondary/60 font-medium text-sm">{t('design')}</span>
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
                {t('dismiss')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
