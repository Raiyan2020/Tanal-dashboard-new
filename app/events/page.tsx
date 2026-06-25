'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Eye, Edit2, Trash2, CalendarSearch, Mail,
  CheckCircle2, Clock, Check, XCircle, Banknote,
  AlertTriangle, Filter, ChevronLeft, ChevronRight, ChevronDown, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';

type EventStatus = 'completed' | 'paid' | 'installments' | 'unpaid' | 'canceled';

import { EventDetails, AppEvent } from './EventDetails';
import { EventEditForm } from './EventEditForm';
import { getEvents, getClients, deleteEvent, type ApiEvent, type Client, type PaginatedItems } from '@/lib/api';
import { getToken } from '@/lib/auth';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

interface EventDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function EventDeleteModal({ isOpen, onClose, onConfirm }: EventDeleteModalProps) {
  const { t, dir } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20">
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
            {t('deleteEventTitle' as any) || 'Delete Event'}
          </h3>
          <p className="text-secondary/70 mb-8">
            {t('deleteEventMessage' as any) || 'Are you sure you want to delete this event? This action cannot be undone.'}
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

export default function EventsPage() {
  const { t, dir } = useLanguage();
  const [token, setToken] = useState<string>('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setToken(getToken() ?? '');
  }, []);

  // ── list state ──
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [pagination, setPagination] = useState<PaginatedItems<ApiEvent>['pagination'] | null>(null);
  const [listLoading, setListLoading] = useState(true);

  // ── filter states ──
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [guestsFilter, setGuestsFilter] = useState<string>('all');
  const [isPaidFilter, setIsPaidFilter] = useState<string>('all');
  const [clientIdFilter, setClientIdFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [showFilters, setShowFilters] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── referenced clients state ──
  const [clients, setClients] = useState<Client[]>([]);

  // ── view state ──
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<AppEvent | null>(null);
  const [eventToView, setEventToView] = useState<AppEvent | null>(null);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Auto-open event when navigated from invitations
  useEffect(() => {
    const eventId = searchParams.get('eventId');
    if (!eventId || events.length === 0) return;
    const matched = events.find(e => e.id === eventId);
    if (matched) {
      setEventToView(matched);
    }
    router.replace('/events');
  }, [searchParams, events, router]);

  // ── fetch events ──
  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const apiStatus = statusFilter === 'canceled' ? 'cancelled' : (statusFilter === 'all' ? undefined : statusFilter);
      const apiGuestRange = guestsFilter === 'all' ? undefined : guestsFilter;
      const apiIsPaid = isPaidFilter === 'all' ? undefined : (isPaidFilter === '1' ? 1 : 0);
      const apiClientId = clientIdFilter === 'all' ? undefined : Number(clientIdFilter);
      const apiDateMin = dateFrom || undefined;
      const apiDateMax = dateTo || undefined;

      const res = await getEvents(token, {
        page,
        per_page: perPage,
        keyword: keyword || undefined,
        status: apiStatus,
        guest_count: apiGuestRange,
        is_paid: apiIsPaid,
        client_id: apiClientId,
        event_date_min: apiDateMin,
        event_date_max: apiDateMax,
      });

      const mappedEvents: AppEvent[] = res.data.items.map((apiEvent) => ({
        id: String(apiEvent.id),
        name: apiEvent.name,
        creationDate: apiEvent.event_date || apiEvent.created_at || '',
        guests: apiEvent.guest_count,
        invitationsCreated: !!apiEvent.invitations_created,
        status: (apiEvent.status === 'cancelled' ? 'canceled' : apiEvent.status) as any,
        eventDate: apiEvent.event_date || undefined,
        eventTime: apiEvent.event_time || undefined,
        eventCost: apiEvent.price || undefined,
        paymentType: apiEvent.payment_type || undefined,
        hallName: apiEvent.hall_name || undefined,
        hallLocation: apiEvent.hall_location || undefined,
        welcomeMessage: apiEvent.welcome_message || undefined,
        assignedEmployeeId: apiEvent.assigned_employee_id ? String(apiEvent.assigned_employee_id) : undefined,
        clientId: apiEvent.client_id ? String(apiEvent.client_id) : undefined,
        reference_number: apiEvent.reference_number,
        status_label: apiEvent.status_label,
        actions: apiEvent.actions,
      }));

      setEvents(mappedEvents);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء تحميل الحفلات');
    } finally {
      setListLoading(false);
    }
  }, [token, page, perPage, keyword, statusFilter, guestsFilter, isPaidFilter, clientIdFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // ── fetch clients list for filter ──
  useEffect(() => {
    if (!token) return;
    getClients(token, { per_page: 100 })
      .then(res => setClients(res.data.items))
      .catch(err => console.error(err));
  }, [token]);


  // ── debounced search ──
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
    }, 500);
  };

  const getStatusDisplay = (event: AppEvent) => {
    switch (event.status) {
      case 'completed': return { label: event.status_label || t('completed'), icon: CheckCircle2, className: 'bg-emerald-100/60 text-emerald-700' };
      case 'paid': return { label: event.status_label || t('paid'), icon: Check, className: 'bg-emerald-100/60 text-emerald-700' };
      case 'installments': return { label: event.status_label || t('installments'), icon: Clock, className: 'bg-amber-100/60 text-amber-700' };
      case 'unpaid': return { label: event.status_label || t('unpaid'), icon: Banknote, className: 'bg-red-100/60 text-red-700' };
      case 'canceled': return { label: event.status_label || t('canceled'), icon: XCircle, className: 'bg-gray-100 text-gray-600' };
      default: return { label: event.status_label || event.status, icon: CheckCircle2, className: 'bg-gray-100 text-gray-600' };
    }
  };

  return (
    <>
      <AnimatePresence>
        {eventToDelete && (
          <EventDeleteModal
            isOpen={!!eventToDelete}
            onClose={() => setEventToDelete(null)}
            onConfirm={async () => {
              if (!token || !eventToDelete) return;
              try {
                await deleteEvent(Number(eventToDelete), token);
                toast.success(dir === 'ltr' ? 'Event deleted successfully' : 'تم حذف الحفل بنجاح');
                setEvents(events.filter(e => e.id !== eventToDelete));
                if (eventToView?.id === eventToDelete) {
                  setEventToView(null);
                }
              } catch (err) {
                toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to delete event' : 'فشل في حذف الحفل'));
              } finally {
                setEventToDelete(null);
              }
            }}
          />
        )}
      </AnimatePresence>

      {(isAddEventModalOpen || eventToEdit) ? (
        <EventEditForm
          event={eventToEdit}
          onBack={() => {
            setIsAddEventModalOpen(false);
            setEventToEdit(null);
          }}
          onSave={(savedEvent) => {
            // Note: save API call integration will be done in the next prompt as requested
            fetchEvents();
            setIsAddEventModalOpen(false);
            setEventToEdit(null);
          }}
        />
      ) : eventToView ? (
        <EventDetails
          event={eventToView}
          onBack={() => setEventToView(null)}
          onEdit={() => setEventToEdit(eventToView)}
          onDelete={() => setEventToDelete(eventToView.id)}
          onUpdateEvent={(updatedEvent) => {
            // Note: update status API call integration will be done in the next prompt as requested
            setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
            setEventToView(updatedEvent);
          }}
        />
      ) : (
        <div className="space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className={cn("text-2xl font-medium text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {t('events')}
              </h2>
              {pagination && (
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {pagination.total}
                </span>
              )}
            </div>

            <button
              onClick={() => setIsAddEventModalOpen(true)}
              className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              {t('addEvent' as any)}
            </button>
          </div>

          <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
            {/* Search + Per-page */}
            <div className="flex flex-col md:flex-row gap-3 mb-4 sm:mb-6 w-full items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
                <input
                  type="text"
                  placeholder={dir === 'ltr' ? 'Search by ID or event name' : 'البحث بالمعرف أو اسم الحفل'}
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2.5 ps-10 pe-4 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 outline-none h-[46px] sm:h-[50px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 bg-white/40 hover:bg-white/60 border rounded-xl text-sm font-medium transition-colors ring-1 ring-secondary/5 cursor-pointer h-[46px] sm:h-[50px]",
                    showFilters ? "border-primary text-primary" : "border-secondary/10 text-secondary"
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {dir === 'ltr' ? 'Filters' : 'تصفية'}
                </button>

                {/* Per-page select */}
                <div className="relative shrink-0">
                  <select
                    value={perPage}
                    onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                    className="appearance-none bg-white/50 border border-secondary/10 rounded-xl px-4 py-2.5 pe-8 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer h-[46px] sm:h-[50px]"
                  >
                    {PER_PAGE_OPTIONS.map(n => (
                      <option key={n} value={n}>{n} {dir === 'ltr' ? 'per page' : 'لكل صفحة'}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute top-1/2 -translate-y-1/2 end-2.5 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4 sm:mb-6"
                >
                  <div className="p-4 bg-white/40 border border-secondary/10 rounded-2xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-secondary/70 mb-1">{dir === 'ltr' ? 'Number of Guests' : 'عدد الضيوف'}</label>
                      <select
                        value={guestsFilter}
                        onChange={(e) => { setGuestsFilter(e.target.value); setPage(1); }}
                        className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40 cursor-pointer"
                      >
                        <option value="all">{dir === 'ltr' ? 'All Guests' : 'جميع الضيوف'}</option>
                        <option value="0-100">0 - 100</option>
                        <option value="101-500">101 - 500</option>
                        <option value="501-1000">501 - 1000</option>
                        <option value="1000+">+1000</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary/70 mb-1">{dir === 'ltr' ? 'Payment Status' : 'حالة الدفع'}</label>
                      <select
                        value={isPaidFilter}
                        onChange={(e) => { setIsPaidFilter(e.target.value); setPage(1); }}
                        className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40 cursor-pointer"
                      >
                        <option value="all">{dir === 'ltr' ? 'All' : 'الكل'}</option>
                        <option value="1">{dir === 'ltr' ? 'Paid Only' : 'مدفوع فقط'}</option>
                        <option value="0">{dir === 'ltr' ? 'Unpaid Only' : 'غير مدفوع فقط'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary/70 mb-1">{dir === 'ltr' ? 'Client' : 'العميل'}</label>
                      <select
                        value={clientIdFilter}
                        onChange={(e) => { setClientIdFilter(e.target.value); setPage(1); }}
                        className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40 cursor-pointer"
                      >
                        <option value="all">{dir === 'ltr' ? 'All Clients' : 'جميع العملاء'}</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary/70 mb-1">{dir === 'ltr' ? 'From Date' : 'تاريخ من'}</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40 cursor-pointer cursor-text"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary/70 mb-1">{dir === 'ltr' ? 'To Date' : 'تاريخ إلى'}</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40 cursor-pointer cursor-text"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status tabs */}
            <div className="flex w-full overflow-x-auto scrollbar-hide gap-2 mb-4 sm:mb-6 pb-2">
              {(['all', 'completed', 'paid', 'installments', 'unpaid', 'canceled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setPage(1); }}
                  className={cn(
                    "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm ring-1 cursor-pointer",
                    statusFilter === status
                      ? "bg-primary text-white ring-primary shadow-md"
                      : "bg-white/60 text-secondary/70 ring-white/60 hover:bg-white hover:text-secondary"
                  )}
                >
                  {status === 'all' ? (dir === 'ltr' ? 'All' : 'الكل') : (t(status as any) || status)}
                </button>
              ))}
            </div>

            {/* Events list */}
            <div className="w-full">
              {listLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : events.length > 0 ? (
                <div className="flex flex-col gap-2 sm:gap-3 w-full">
                  <AnimatePresence mode="popLayout">
                    {events.map((event) => {
                      const statusInfo = getStatusDisplay(event);
                      const StatusIcon = statusInfo.icon;

                      return (
                        <motion.div
                          key={event.id}
                          onClick={() => setEventToView(event)}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors w-full"
                        >
                          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">#{event.reference_number || event.id}</span>
                              <h3 className="font-semibold text-secondary text-base truncate">{event.name}</h3>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-1.5 sm:gap-3">
                              <div className="flex items-center gap-1">
                                <CalendarSearch className="w-4 h-4 shrink-0" />
                                <span className="truncate max-w-full" dir="ltr">{event.creationDate}</span>
                              </div>
                              <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                              <span className="truncate max-w-full">{event.guests} {t('guests')}</span>

                              <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                              <div className="flex items-center gap-1.5 mt-0.5 sm:mt-0">
                                {event.invitationsCreated ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                                    <Mail className="w-3 h-3" />
                                    {t('viewInvitations')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-secondary/5 text-secondary/50 text-xs font-medium">
                                    {t('notCreated') || (dir === 'ltr' ? 'Not Created' : 'غير منشأ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 md:gap-2 mt-2 md:mt-0 border-t border-secondary/5 md:border-none pt-2 md:pt-0 shrink-0 min-w-[200px]">

                            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium w-fit", statusInfo.className)}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusInfo.label}
                            </div>

                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                title={t('view') || (dir === 'ltr' ? 'View' : 'عرض')}
                                onClick={(e) => { e.preventDefault(); setEventToView(event); }}
                                className="p-2 sm:p-2 bg-white text-secondary/60 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {(event.actions ? event.actions.can_edit : true) && (
                                <button
                                  title={t('edit' as any) || (dir === 'ltr' ? 'Edit' : 'تعديل')}
                                  onClick={(e) => { e.preventDefault(); setEventToEdit(event); }}
                                  className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {(event.actions ? event.actions.can_delete : true) && (
                                <button
                                  title={t('remove') || (dir === 'ltr' ? 'Remove' : 'حذف')}
                                  onClick={(e) => { e.preventDefault(); setEventToDelete(event.id); }}
                                  className="p-2 sm:p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
                  <CalendarSearch className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">{dir === 'ltr' ? 'No events found.' : 'لا يوجد حفلات للأسف.'}</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination && !listLoading && (
              <Pagination pagination={pagination} onPage={p => setPage(p)} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Pagination ───────────────────────────────────────────────── */
function Pagination({
  pagination,
  onPage,
}: {
  pagination: PaginatedItems<ApiEvent>['pagination'];
  onPage: (p: number) => void;
}) {
  const { last_page, current_page } = pagination;
  if (last_page <= 1) return null;

  const pages = Array.from({ length: last_page }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 pt-6 flex-wrap">
      <button
        onClick={() => onPage(current_page - 1)}
        disabled={current_page === 1}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={cn(
            'w-9 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer',
            p === current_page
              ? 'bg-primary text-white shadow-md'
              : 'bg-white/50 border border-secondary/10 hover:bg-white/80 text-secondary',
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(current_page + 1)}
        disabled={current_page === last_page}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
