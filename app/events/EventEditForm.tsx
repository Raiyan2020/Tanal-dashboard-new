import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ChevronDown, Search, User, Calendar, Clock, Building, MapPin, MessageSquare, DollarSign, Bold, Italic, Strikethrough, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { AppEvent } from './EventDetails';
import { getClients, getClientById, createEvent, updateEvent, getEventById, type Client } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';

interface EventEditFormProps {
  event: AppEvent | null;
  onBack: () => void;
  onSave: (event: AppEvent) => void;
}

export function EventEditForm({ event, onBack, onSave }: EventEditFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

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
  const [firstInstallmentAmount, setFirstInstallmentAmount] = useState<string>('');

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  // fetch selected client profile on edit mode if client is not in initial list
  useEffect(() => {
    if (!token || !event?.clientId) return;
    getClientById(Number(event.clientId), token)
      .then(res => setSelectedClient(res.data))
      .catch(err => console.error(err));
  }, [token, event?.clientId]);

  const fetchClients = useCallback(async (pageNum: number, searchKeyword: string, isAppend: boolean) => {
    if (!token) return;
    setClientsLoading(true);
    try {
      const res = await getClients(token, { page: pageNum, per_page: 15, keyword: searchKeyword });
      const newClients = res.data.items;
      
      setClients(prev => {
        const combined = isAppend ? [...prev, ...newClients] : newClients;
        const unique = combined.filter((c, idx, self) => self.findIndex(x => x.id === c.id) === idx);
        return unique;
      });
      
      setHasMore(pageNum < res.data.pagination.last_page);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل قائمة العملاء');
    } finally {
      setClientsLoading(false);
    }
  }, [token]);

  // Fetch when page changes
  useEffect(() => {
    if (page > 1) {
      fetchClients(page, keyword, true);
    }
  }, [page, keyword, fetchClients]);

  // Debounced keyword changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      setPage(1);
      setHasMore(true);
      fetchClients(1, keyword, false);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [keyword, fetchClients]);

  // Click outside handler for client select dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close datepicker when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getMinAllowedDate = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    minDate.setHours(0, 0, 0, 0);
    return minDate;
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setEventDate(`${yyyy}-${mm}-${dd}`);
    setShowDatePicker(false);
  };

  const selectedDate = eventDate ? new Date(eventDate) : undefined;

  useEffect(() => {
    if (!token || !event?.id) return;
    getEventById(Number(event.id), token)
      .then(res => {
        const detail = res.data;
        if (detail.financial_transaction?.first_installment_amount) {
          setFirstInstallmentAmount(String(parseFloat(detail.financial_transaction.first_installment_amount)));
        }
      })
      .catch(err => console.error('Failed to load event details for editing:', err));
  }, [token, event?.id]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { toast.error(dir === 'ltr' ? 'Please select a client' : 'يرجى اختيار العميل'); return; }
    if (!eventDate) { toast.error(dir === 'ltr' ? 'Please select event date' : 'يرجى اختيار تاريخ الحفل'); return; }

    // Validate event date (must be after next 2 days, unless it is an existing event with unmodified date)
    const minAllowedDate = getMinAllowedDate();
    const selected = new Date(eventDate);
    selected.setHours(0, 0, 0, 0);
    const dateChanged = !event || event.eventDate !== eventDate;
    if (dateChanged && selected < minAllowedDate) {
      toast.error(
        dir === 'ltr'
          ? 'Event date must be at least 2 days from today'
          : 'تاريخ الحفل يجب أن يكون بعد يومين على الأقل من اليوم'
      );
      return;
    }

    if (!eventTime) { toast.error(dir === 'ltr' ? 'Please select event time' : 'يرجى اختيار وقت الحفل'); return; }
    if (!hallName.trim()) { toast.error(dir === 'ltr' ? 'Please enter hall name' : 'يرجى إدخال اسم القاعة'); return; }
    if (!welcomeMessage.trim()) { toast.error(dir === 'ltr' ? 'Please enter WhatsApp welcome message' : 'يرجى إدخال رسالة الترحيب'); return; }
    if (!totalCost) { toast.error(dir === 'ltr' ? 'Please enter total cost' : 'يرجى إدخال التكلفة الإجمالية'); return; }

    const isTwoInstallments = !isPaid && paymentType === 'installments';
    const parsedCost = Number(totalCost);

    if (isTwoInstallments) {
      if (!firstInstallmentAmount) {
        toast.error(dir === 'ltr' ? 'Please enter first installment amount' : 'يرجى إدخال قيمة الدفعة الأولى');
        return;
      }
      if (Number(firstInstallmentAmount) > parsedCost) {
        toast.error(
          dir === 'ltr'
            ? 'First installment cannot exceed total cost'
            : 'قيمة الدفعة الأولى لا يمكن أن تتجاوز التكلفة الإجمالية'
        );
        return;
      }
    }

    setLoading(true);
    try {
      const apiPaymentType = isTwoInstallments ? 'two_installments' : 'single';

      const fields = {
        client_id: Number(clientId),
        event_date: eventDate,
        event_time: eventTime,
        hall_name: hallName,
        location_url: hallLocation.trim() ? hallLocation : undefined,
        whatsapp_message: welcomeMessage,
        total_cost: parsedCost,
        is_paid: (isPaid ? 1 : 0) as 0 | 1,
        payment_type: apiPaymentType as 'single' | 'two_installments',
        ...(isTwoInstallments ? { first_installment_amount: Number(firstInstallmentAmount) } : {}),
      };

      let res;
      if (event) {
        res = await updateEvent(Number(event.id), fields, token);
      } else {
        res = await createEvent(fields, token);
      }

      toast.success(res.msg || (event ? 'تم تعديل المناسبة بنجاح' : 'تم إضافة المناسبة بنجاح'));

      const mappedEvent: AppEvent = {
        id: String(res.data.id),
        name: res.data.name,
        creationDate: res.data.event_date || res.data.created_at || '',
        guests: res.data.guest_count,
        invitationsCreated: !!res.data.invitations_created,
        status: (res.data.status === 'cancelled' ? 'canceled' : res.data.status) as any,
        eventDate: res.data.event_date || undefined,
        eventTime: res.data.event_time || undefined,
        eventCost: res.data.price || undefined,
        paymentType: res.data.payment_type || undefined,
        hallName: res.data.hall_name || undefined,
        hallLocation: res.data.hall_location || undefined,
        welcomeMessage: res.data.welcome_message || undefined,
        assignedEmployeeId: res.data.assigned_employee_id ? String(res.data.assigned_employee_id) : undefined,
        clientId: res.data.client_id ? String(res.data.client_id) : undefined,
        reference_number: res.data.reference_number,
        status_label: res.data.status_label,
      };

      onSave(mappedEvent);
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء حفظ المناسبة');
    } finally {
      setLoading(false);
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
          <span className="font-medium">{t('back' as any)}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {event ? (dir === 'ltr' ? 'Edit Event' : 'تعديل الحفل') : (dir === 'ltr' ? 'Add Event' : 'إضافة حفل')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2 cursor-pointer">
              <User className="w-4 h-4 text-secondary/50" />
              {dir === 'ltr' ? 'Select Client' : 'اختر العميل'} <span className="text-red-500">*</span>
            </label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 text-start text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all flex justify-between items-center cursor-pointer font-medium text-sm h-[46px] sm:h-[50px]"
              >
                <span>
                  {selectedClient
                    ? selectedClient.name
                    : (dir === 'ltr' ? 'Choose a client...' : 'اختر عميلاً...')}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-secondary/50 shrink-0 transition-transform duration-200", dropdownOpen && "rotate-180")} />
              </button>

              <input
                type="hidden"
                value={clientId}
                name="client_id"
                required
              />

              {dropdownOpen && (
                <div className="absolute z-[70] mt-2 w-full bg-white border border-secondary/15 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[300px]">
                  <div className="p-2 border-b border-secondary/5 relative flex items-center shrink-0">
                    <Search className="absolute left-4 rtl:right-4 w-4 h-4 text-secondary/40" />
                    <input
                      type="text"
                      placeholder={dir === 'ltr' ? 'Search clients...' : 'البحث عن عميل...'}
                      value={keyword}
                      onChange={e => setKeyword(e.target.value)}
                      className={cn(
                        "w-full bg-secondary/5 border border-secondary/10 rounded-xl py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30",
                        dir === 'ltr' ? 'pl-9 pr-3' : 'pr-9 pl-3'
                      )}
                    />
                  </div>

                  <div
                    onScroll={(e) => {
                      const target = e.currentTarget;
                      if (target.scrollHeight - target.scrollTop <= target.clientHeight + 20) {
                        if (hasMore && !clientsLoading) {
                          setPage(prev => prev + 1);
                        }
                      }
                    }}
                    className="overflow-y-auto flex-1 divide-y divide-secondary/5"
                  >
                    {clients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClientId(String(c.id));
                          setSelectedClient(c);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-start px-4 py-3 text-sm hover:bg-secondary/5 transition-colors flex items-center justify-between cursor-pointer",
                          clientId === String(c.id) && "bg-primary/5 text-primary font-semibold"
                        )}
                      >
                        <div className="flex flex-col">
                          <span>{c.name}</span>
                          <span className="text-[10px] text-secondary/50 font-mono mt-0.5">{c.full_phone || c.phone}</span>
                        </div>
                        {clientId === String(c.id) && (
                          <span className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </button>
                    ))}

                    {clients.length === 0 && !clientsLoading && (
                      <div className="p-4 text-center text-xs text-secondary/40">
                        {dir === 'ltr' ? 'No clients found' : 'لا يوجد عملاء'}
                      </div>
                    )}

                    {clientsLoading && (
                      <div className="p-3 flex justify-center items-center">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-secondary/50" />
                {dir === 'ltr' ? 'Event Date' : 'تاريخ الحفل'} <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 text-start text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all flex justify-between items-center cursor-pointer font-medium text-sm h-[46px] sm:h-[50px]"
                >
                  <span>{eventDate || (dir === 'ltr' ? 'Select event date...' : 'اختر تاريخ الحفل...')}</span>
                  <Calendar className="w-4 h-4 text-secondary/50 shrink-0" />
                </button>

                {showDatePicker && (
                  <div className="absolute z-[60] mt-2 p-3 bg-white border border-secondary/15 rounded-2xl shadow-xl left-0 rtl:right-0">
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={{ before: getMinAllowedDate() }}
                      locale={dir === 'rtl' ? ar : undefined}
                      dir={dir}
                    />
                  </div>
                )}
              </div>
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
              onChange={e => {
                const val = e.target.value;
                setTotalCost(val);
                if (val && !isNaN(Number(val))) {
                  setFirstInstallmentAmount(String(Number(val) / 2));
                } else {
                  setFirstInstallmentAmount('');
                }
              }}
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
            <div className="pt-2 space-y-4">
              <div>
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
                      onChange={() => {
                        setPaymentType('installments');
                        if (totalCost && !isNaN(Number(totalCost))) {
                          setFirstInstallmentAmount(String(Number(totalCost) / 2));
                        }
                      }}
                      className="w-4 h-4 text-primary bg-white border-secondary/30 focus:ring-primary/30"
                    />
                    <span className="text-sm text-secondary/80 font-medium">{dir === 'ltr' ? 'Two Installments' : 'دفعتين'}</span>
                  </label>
                </div>
              </div>

              {paymentType === 'installments' && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-secondary/80 mb-1.5 mx-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-secondary/50" />
                    {dir === 'ltr' ? 'First Installment Amount' : 'قيمة الدفعة الأولى'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={firstInstallmentAmount}
                    onChange={e => setFirstInstallmentAmount(e.target.value)}
                    className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
                    placeholder={totalCost ? String(Number(totalCost) / 2) : ''}
                  />
                </div>
              )}
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
              disabled={loading}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {event ? (dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات') : <><Send className={cn("w-4 h-4", dir === 'rtl')} /> {dir === 'ltr' ? 'Create & Send Link' : 'إنشاء وإرسال الرابط'}</>}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
