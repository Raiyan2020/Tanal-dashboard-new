'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Edit2, Trash2, Eye, Calendar, Users, Send, Clock, Ticket, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';
import { InvitationDetails } from './InvitationDetails';
import { InvitationEditForm } from './InvitationEditForm';
import { getInvitations, deleteInvitation, type ApiInvitation } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

export type InvitationStatus = 'sent' | 'unsent' | 'past';

export interface Invitation {
  id: string;
  /** Empty for legacy invitations that were never migrated off an event. */
  serviceOrderId: string;
  serviceOrderReference: string;
  clientName: string;
  clientPhone: string;
  executionDate: string;
  deadlineDate: string;
  guestsNumber: number;
  guestsIncluded: number | null;
  isBarcodeSuspended: boolean;
  whatsappUrl: string;
  status: InvitationStatus;
}

/**
 * Maps an API invitation to the view model. Shared with the server component so
 * the prefetched page and client refetches agree on shape.
 */
export function mapApiInvitation(apiInv: ApiInvitation): Invitation {
  const status: InvitationStatus = apiInv.status === 'previous'
    ? 'past'
    : apiInv.is_sent ? 'sent' : 'unsent';

  return {
    id: String(apiInv.id),
    serviceOrderId: apiInv.service_order_id != null ? String(apiInv.service_order_id) : '',
    serviceOrderReference: apiInv.service_order_reference ?? apiInv.event_name ?? '—',
    clientName: apiInv.client_name ?? '',
    clientPhone: apiInv.client_phone ?? '',
    executionDate: apiInv.execution_date ?? '',
    deadlineDate: apiInv.deadline_date ?? '',
    guestsNumber: apiInv.guest_count,
    guestsIncluded: apiInv.guests_included,
    isBarcodeSuspended: apiInv.is_barcode_suspended,
    whatsappUrl: apiInv.whatsapp_url ?? '',
    status,
  };
}

export default function InvitationsClient({
  initialData,
  initialTotalPages,
}: {
  initialData: Invitation[] | null;
  initialTotalPages: number;
}) {
  const { t, dir } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token] = useState(() => getToken() ?? '');

  const [searchInput, setSearchInput] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const [primaryFilter, setPrimaryFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [secondaryFilter, setSecondaryFilter] = useState<'all' | 'sent' | 'unsent'>('all');

  const [invitations, setInvitations] = useState<Invitation[]>(initialData ?? []);
  const [invitationToDelete, setInvitationToDelete] = useState<string | null>(null);

  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null);
  const [viewingInvitation, setViewingInvitation] = useState<Invitation | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [listLoading, setListLoading] = useState(!initialData);

  const isInitialMount = useRef(true);

  // Debounce search keywords
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setDebouncedKeyword(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchInput]);

  // Fetch invitations from API
  const fetchInvitations = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const periodParam =
        primaryFilter === 'past' ? 'previous'
          : primaryFilter === 'upcoming' ? 'upcoming'
            : undefined;

      const res = await getInvitations(token, {
        page,
        per_page: 15,
        keyword: debouncedKeyword || undefined,
        period: periodParam,
      });

      setInvitations(res.data.items.map(mapApiInvitation));
      setTotalPages(res.data.pagination.last_page);
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء تحميل قائمة الدعوات');
    } finally {
      setListLoading(false);
    }
  }, [token, page, debouncedKeyword, primaryFilter]);

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchInvitations();
  }, [fetchInvitations, initialData]);

  // Auto-open an invitation when arriving from a service order
  useEffect(() => {
    if (invitations.length === 0) return;

    const invitationId = searchParams.get('invitationId');
    const serviceOrderId = searchParams.get('serviceOrderId');
    if (!invitationId && !serviceOrderId) return;

    const matched = invitationId
      ? invitations.find(inv => inv.id === invitationId)
      : invitations.find(inv => inv.serviceOrderId === serviceOrderId);
    if (matched) {
      setViewingInvitation(matched);
    }
    router.replace('/invitations');
  }, [searchParams, invitations, router]);

  // Filter on secondary filter locally (since secondary filter 'sent'/'unsent' is client side)
  const filteredInvitations = invitations.filter((inv) => {
    if (primaryFilter === 'upcoming' && secondaryFilter !== 'all') {
      return inv.status === secondaryFilter;
    }
    return true;
  });

  const getStatusDisplay = (status: InvitationStatus) => {
    switch (status) {
      case 'sent':
        return {
          icon: Send,
          label: t('sent' as any) || (dir === 'ltr' ? 'Sent' : 'مرسلة'),
          colors: 'text-emerald-600 bg-emerald-50 ring-emerald-500/20'
        };
      case 'unsent':
        return {
          icon: Clock,
          label: t('unsent' as any) || (dir === 'ltr' ? 'Unsent' : 'غير مرسلة'),
          colors: 'text-amber-600 bg-amber-50 ring-amber-500/20'
        };
      case 'past':
        return {
          icon: Calendar,
          label: t('past' as any) || (dir === 'ltr' ? 'Past' : 'سابقة'),
          colors: 'text-gray-600 bg-gray-50 ring-gray-500/20'
        };
    }
  };

  const handleDelete = async () => {
    if (!invitationToDelete || !token) return;
    const deleteToast = toast.loading('Deleting invitation...');
    try {
      await deleteInvitation(Number(invitationToDelete), token);
      toast.dismiss(deleteToast);
      toast.success('تم حذف الدعوة بنجاح');
      setInvitations(prev => prev.filter(inv => inv.id !== invitationToDelete));
    } catch (err) {
      toast.dismiss(deleteToast);
      toast.error((err as Error).message || 'فشل حذف الدعوة');
    } finally {
      setInvitationToDelete(null);
    }
  };

  const handlePrimaryFilterChange = (filter: 'all' | 'upcoming' | 'past') => {
    setPrimaryFilter(filter);
    setSecondaryFilter('all');
    setPage(1);
  };

  if (editingInvitation) {
    return (
      <InvitationEditForm
        invitation={editingInvitation}
        onBack={() => setEditingInvitation(null)}
        onSave={(savedInvitation) => {
          setInvitations(invitations.map(inv => inv.id === savedInvitation.id ? savedInvitation : inv));
          if (viewingInvitation?.id === savedInvitation.id) {
            setViewingInvitation(savedInvitation);
          }
          setEditingInvitation(null);
        }}
      />
    );
  }

  if (viewingInvitation) {
    return (
      <InvitationDetails
        invitation={viewingInvitation}
        onBack={() => setViewingInvitation(null)}
        onNavigateToServiceOrder={(serviceOrderId) => {
          router.push(`/service-orders?orderId=${serviceOrderId}`);
        }}
        onEdit={(invitation) => {
          setViewingInvitation(null);
          setEditingInvitation(invitation);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-start">
        <div>
          <h2 className={cn("text-2xl font-semibold text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('invitations' as any) || (dir === 'ltr' ? 'Invitations' : 'الدعوات')}
          </h2>
          <p className="text-secondary/60 mt-1">{t('manageInvitations' as any) || (dir === 'ltr' ? 'Manage your event invitations' : 'إدارة دعوات مناسباتك')}</p>
        </div>
        {/* No create button — invitations are created by the backend when a
            service order includes the barcode/QR system service. */}
      </div>

      <div className="glass-panel p-4 sm:p-6 rounded-3xl">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-4 pointer-events-none text-secondary/40">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            placeholder={t('searchInvitations' as any) || (dir === 'ltr' ? 'Search invitations...' : 'البحث عن دعوات...')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-12 pr-4 rtl:pr-12 rtl:pl-4 transition-all outline-none text-secondary text-start"
          />
        </div>

        <div className="flex w-full overflow-x-auto scrollbar-hide gap-2 mb-4 pb-2">
          {([
            { id: 'all', label: t('all' as any) || (dir === 'ltr' ? 'All' : 'الكل') },
            { id: 'upcoming', label: t('upcoming' as any) || (dir === 'ltr' ? 'Upcoming' : 'قادمة') },
            { id: 'past', label: t('past' as any) || (dir === 'ltr' ? 'Past' : 'سابقة') },
          ] as const).map((option) => (
            <button
              key={option.id}
              onClick={() => handlePrimaryFilterChange(option.id)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ring-1 cursor-pointer",
                primaryFilter === option.id
                  ? "bg-primary text-white ring-primary shadow-primary/20"
                  : "bg-white text-secondary/70 ring-black/5 hover:bg-secondary/5 hover:text-secondary"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {primaryFilter === 'upcoming' && (
          <div className="flex w-full overflow-x-auto scrollbar-hide gap-2 mb-6 pb-2">
            {([
              { id: 'all', label: t('all' as any) || (dir === 'ltr' ? 'All' : 'الكل') },
              { id: 'sent', label: t('sent' as any) || (dir === 'ltr' ? 'Sent' : 'مرسلة') },
              { id: 'unsent', label: t('unsent' as any) || (dir === 'ltr' ? 'Unsent' : 'غير مرسلة') },
            ] as const).map((option) => (
              <button
                key={option.id}
                onClick={() => setSecondaryFilter(option.id)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ring-1 cursor-pointer",
                  secondaryFilter === option.id
                    ? "bg-primary text-white ring-primary shadow-primary/20"
                    : "bg-white text-secondary/70 ring-black/5 hover:bg-secondary/5 hover:text-secondary"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          {listLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <AnimatePresence>
              {filteredInvitations.length > 0 ? (
                filteredInvitations.map((invitation) => {
                  const statusInfo = getStatusDisplay(invitation.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <motion.div
                      key={invitation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setViewingInvitation(invitation)}
                      className="p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group hover:bg-white/60 transition-colors w-full cursor-pointer"
                    >
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Ticket className="w-4 h-4" />
                          </div>
                          <h3 className="font-semibold text-secondary text-base truncate font-mono">{invitation.serviceOrderReference}</h3>
                          {invitation.clientName && (
                            <span className="text-sm text-secondary/60 truncate">{invitation.clientName}</span>
                          )}
                          <span className={cn("px-2.5 py-1 text-[11px] font-medium rounded-full ring-1 shadow-sm flex items-center gap-1 shrink-0", statusInfo.colors)}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                          {invitation.isBarcodeSuspended && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold shrink-0">
                              {dir === 'ltr' ? 'Suspended' : 'موقوف'}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-2 sm:gap-4 mt-1">
                          {invitation.executionDate && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                <span>{dir === 'ltr' ? 'Execution' : 'التنفيذ'}: {invitation.executionDate}</span>
                              </div>
                              <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                            </>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{t('deadline' as any) || (dir === 'ltr' ? 'Deadline' : 'الموعد النهائي')}: {invitation.deadlineDate || '—'}</span>
                          </div>
                          <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 shrink-0" />
                            <span className={cn(
                              invitation.guestsIncluded != null && invitation.guestsNumber > invitation.guestsIncluded
                                && 'text-amber-600 font-semibold'
                            )}>
                              {invitation.guestsNumber}
                              {invitation.guestsIncluded != null && ` / ${invitation.guestsIncluded}`}
                              {' '}{t('guests' as any) || (dir === 'ltr' ? 'Guests' : 'الضيوف')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 md:mt-0 border-t border-secondary/5 md:border-none pt-3 md:pt-0 justify-end shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          title={dir === 'ltr' ? "View" : "عرض"}
                          onClick={() => setViewingInvitation(invitation)}
                          className="p-2 sm:p-2.5 bg-white text-blue-500 border border-transparent hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {invitation.status !== 'past' && (
                          <button
                            title={t('edit' as any) || (dir === 'ltr' ? 'Edit' : 'تعديل')}
                            onClick={() => setEditingInvitation(invitation)}
                            className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {invitation.status === 'unsent' && (
                          <button
                            title={t('remove' as any) || (dir === 'ltr' ? 'Remove' : 'إزالة')}
                            onClick={() => setInvitationToDelete(invitation.id)}
                            className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4"
                >
                  <Ticket className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-base">{t('noDataFound' as any) || (dir === 'ltr' ? 'No invitations found' : 'لم يتم العثور على دعوات')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Pagination Controls */}
        {!listLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6 mt-4 border-t border-secondary/5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className="text-xs text-secondary/60 font-mono px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!invitationToDelete}
        onClose={() => setInvitationToDelete(null)}
        onConfirm={handleDelete}
        title={t('confirmDeleteInvitation' as any) || (dir === 'ltr' ? 'Delete Invitation' : 'حذف الدعوة')}
        message={t('confirmDeleteInvitationMessage' as any) || (dir === 'ltr' ? 'Are you sure you want to delete this invitation?' : 'هل أنت متأكد من رغبتك في حذف هذه الدعوة؟')}
      />

    </div>
  );
}
