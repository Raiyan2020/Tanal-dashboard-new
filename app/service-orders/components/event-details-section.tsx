import React, { useState, useRef, useEffect } from 'react';
import { Book, Calendar, Clock, MapPin } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';
import { type FormState, type OrderFormErrors } from '@/lib/service-order-form';
import { MapLocationPicker } from '@/components/map-location-picker';
import {
  displayOffset,
  endOffset,
  endSlots,
  endsNextDay,
  offGridSlot,
  slotLabel,
  startOffset,
  startSlots,
  type TimeSlot,
} from '@/lib/event-time-slots';

interface EventDetailsSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  /** YYYY-MM-DD lower bound, or undefined to allow past dates (edit mode). */
  minDate?: string;
  errors?: OrderFormErrors;
  /**
   * Quick mode asks only for the date and start time. End time, hall and
   * address all come from the client's own form afterwards.
   */
  quick?: boolean;
}

/**
 * `"2026-08-07"` → local midnight. `new Date(str)` would parse it as *UTC*
 * midnight, which renders as the previous day anywhere west of Greenwich and
 * would shift the picker's lower bound by a day.
 */
const parseLocalDate = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export function EventDetailsSection({
  form,
  setForm,
  minDate,
  errors = {},
  quick = false,
}: EventDetailsSectionProps) {
  const { t, dir, language } = useLanguage();

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const minDateObj = minDate ? parseLocalDate(minDate) : undefined;
  const selectedDate = form.date ? parseLocalDate(form.date) : undefined;

  /**
   * A saved order may carry a time that is not on the 30-minute grid — set
   * before this grid existed, or outside the 06:00–23:30 start window. Keeping
   * it in the list means opening an order for edit never silently drops it.
   */
  const withCurrentValue = (slots: TimeSlot[], current: string, offset: number | null) => {
    if (!current || slots.some(s => s.value === current) || offset === null) return slots;
    return [...slots, offGridSlot(current, offset)].sort((a, b) => a.offset - b.offset);
  };

  // Passing the date drops the slots that have already gone when the event is
  // *today* — at 12:18 the list starts at 12:30, matching the backend's
  // "same-day start must be in the future" rule.
  //
  // `displayOffset`, not `startOffset`: a start that is out of range — 05:00 on
  // a legacy order, or a time that has since passed — must still appear, so
  // validation can flag it rather than the dropdown silently clearing it.
  const startOptions = withCurrentValue(
    startSlots(form.date),
    form.time,
    displayOffset(form.time),
  );

  /** Today, picked after 23:30: no start is left on the operating day. */
  const noStartSlots = startOptions.length === 0;

  // The end list is relative to the start, so it stays locked until a start is
  // chosen and only offers the slots after it — through 04:00 the next morning.
  const endDisabled = startOffset(form.time) === null;
  const endOptions = withCurrentValue(
    endSlots(form.time),
    form.endTime,
    endOffset(form.endTime, form.time),
  );
  // Every start up to 23:30 has 04:00-next-day available, so this is only
  // reachable via an off-grid start on an existing order.
  const noEndSlots = !endDisabled && endOptions.length === 0;

  /** Picking a start time drops an end time that is no longer after it. */
  const onStartChange = (value: string) => {
    const nextStart = startOffset(value);

    // Quick mode never asks for an end time, so none of this applies there.
    if (quick || nextStart === null) {
      setForm({ ...form, time: value, endTime: nextStart === null ? '' : form.endTime });
      return;
    }

    // Keep the current end only if it is still after the new start and still
    // within range — `endSlots` is the same list the dropdown will render.
    const stillValid = endSlots(value).some(s => s.value === form.endTime);
    setForm({ ...form, time: value, endTime: stillValid ? form.endTime : '' });
  };

  const errorText = 'text-xs text-red-500 mt-0.5';
  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm placeholder:text-secondary/40';

  const dateFormat: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const dateLocale = language === 'ar' ? 'ar-EG' : 'en-US';

  const displayDate = form.date
    ? parseLocalDate(form.date).toLocaleDateString(dateLocale, dateFormat)
    : null;

  /** The calendar day after the event date — where a past-midnight end lands. */
  const endDateLabel = (() => {
    if (!form.date) return null;
    const next = parseLocalDate(form.date);
    next.setDate(next.getDate() + 1);
    return next.toLocaleDateString(dateLocale, dateFormat);
  })();

  return (
    <>
      {/* Date */}
       {quick ? null : (
      <>
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
          <Book className="w-4 h-4 text-secondary/40" />
          {t('eventName')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          minLength={3}
          placeholder={t('eventNamePlaceholder')}
          value={form.hallName}
          onChange={e => setForm({ ...form, hallName: e.target.value })}
          className={inputClass}
        />
        {errors.hall_name && <p className={errorText}>{errors.hall_name}</p>}
      </div>
      </>
      )}
      <div className="grid grid-cols-1 gap-4">
        {/* Date — DayPicker dropdown */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
            <Calendar className="w-4 h-4 text-secondary/40" /> {t('eventDate') || 'Event Date'} <span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker(p => !p)}
              className="w-full bg-white/50 border border-white/60 rounded-xl px-4 py-3 text-start focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all flex justify-between items-center cursor-pointer text-sm h-[46px] sm:h-[50px]"
            >
              <span className={displayDate ? 'text-secondary font-medium' : 'text-secondary/40'}>
                {displayDate || (language === 'ar' ? 'اختر التاريخ...' : 'Select date...')}
              </span>
              <Calendar className="w-4 h-4 text-secondary/50 shrink-0" />
            </button>

            {showDatePicker && (
              <div className="absolute z-[60] mt-2 p-3 bg-white border border-secondary/15 rounded-2xl shadow-xl left-0 rtl:right-0 rtl:left-auto">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (!date) return;
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const dd = String(date.getDate()).padStart(2, '0');
                    setForm({ ...form, date: `${yyyy}-${mm}-${dd}` });
                    setShowDatePicker(false);
                  }}
                  disabled={minDateObj ? { before: minDateObj } : undefined}
                  locale={dir === 'rtl' ? ar : undefined}
                  dir={dir}
                />
              </div>
            )}
          </div>
          {errors.event_date && <p className={errorText}>{errors.event_date}</p>}
        </div>
      </div>

      {/* Start + End time — end is required in full mode and must be after start */}
      <div className={quick ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
            <Clock className="w-4 h-4 text-secondary/40" /> {t('eventTime') || 'Start Time'} <span className="text-red-500">*</span>
          </label>
          <select
            required
            disabled={noStartSlots}
            title={
              noStartSlots
                ? language === 'ar'
                  ? 'لم يتبق وقت متاح اليوم، اختر تاريخاً آخر'
                  : 'No start time is left today — pick another date'
                : undefined
            }
            value={form.time}
            onChange={e => onStartChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary/5"
          >
            <option value="">
              {noStartSlots
                ? language === 'ar' ? 'لم يتبق وقت اليوم' : 'No time left today'
                : language === 'ar' ? 'اختر الوقت...' : 'Select time...'}
            </option>
            {startOptions.map(slot => (
              <option key={slot.value} value={slot.value}>{slotLabel(slot, language)}</option>
            ))}
          </select>
          {errors.event_time && <p className={errorText}>{errors.event_time}</p>}
        </div>

        {!quick && (
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
            <Clock className="w-4 h-4 text-secondary/40" />
            {language === 'ar' ? 'وقت الانتهاء' : 'End Time'} <span className="text-red-500">*</span>
          </label>
          <select
            required
            disabled={endDisabled || noEndSlots}
            title={
              endDisabled
                ? language === 'ar'
                  ? 'اختر وقت البدء أولاً'
                  : 'Select the start time first'
                : noEndSlots
                  ? language === 'ar'
                    ? 'لا توجد أوقات متاحة بعد وقت البدء'
                    : 'No times are available after the start time'
                  : undefined
            }
            value={form.endTime}
            onChange={e => setForm({ ...form, endTime: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-secondary/5"
          >
            <option value="">
              {endDisabled
                ? language === 'ar' ? 'اختر وقت البدء أولاً' : 'Select the start time first'
                : noEndSlots
                  ? language === 'ar' ? 'لا توجد أوقات متاحة' : 'No times available'
                  : language === 'ar' ? 'اختر الوقت...' : 'Select time...'}
            </option>
            {/*
              Only slots after the start, running through 04:00 the next morning —
              a 20:00 event can end at 03:00, and those options are labelled
              "(next day)" so they are not read as the event-date morning.
            */}
            {endOptions.map(slot => (
              <option key={slot.value} value={slot.value}>{slotLabel(slot, language)}</option>
            ))}
          </select>
          {errors.event_end_time && <p className={errorText}>{errors.event_end_time}</p>}
        </div>
        )}
      </div>

      {/*
        Spell out the resolved span when the event runs past midnight. The option
        is already labelled "(next day)", but naming the actual date is what stops
        someone reading "03:00 AM" as the morning of the event date.
      */}
      {!quick && endDateLabel && endsNextDay(form.time, form.endTime) && (
        <p className="flex items-center gap-1.5 text-xs text-secondary/60 -mt-2">
          <Clock className="w-3.5 h-3.5 shrink-0 text-primary/60" />
          {language === 'ar'
            ? `يمتد المناسية بعد منتصف الليل وينتهي في ${endDateLabel}`
            : `Runs past midnight and ends on ${endDateLabel}`}
        </p>
      )}

      {/* Hall + address — quick mode defers all of this to the client's form */}
      {quick ? null : (
      <>
   
      {/* Hall location — pin, description and link */}
      <MapLocationPicker
        value={{
          locationUrl: form.hallLocation,
          mapDesc: form.mapDesc,
          lat: form.lat,
          lng: form.lng,
        }}
        onChange={next =>
          setForm(prev => ({
            ...prev,
            hallLocation: next.locationUrl,
            mapDesc: next.mapDesc,
            lat: next.lat,
            lng: next.lng,
          }))
        }
      />

      {/* Address breakdown — all optional */}
      <div className="space-y-4 border-t border-secondary/10 pt-4">
        <h3 className="flex items-center gap-2 text-base font-bold text-secondary">
          <MapPin className="w-4 h-4 text-secondary/40" />
          {language === 'ar' ? 'العنوان' : 'Address'}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {language === 'ar' ? 'المحافظة' : 'Governorate'}
            </label>
            <input
              type="text"
              placeholder={language === 'ar' ? 'حولي' : 'Hawalli'}
              value={form.governorate}
              onChange={e => setForm({ ...form, governorate: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {language === 'ar' ? 'القطعة' : 'Block'}
            </label>
            <input
              type="text"
              placeholder={language === 'ar' ? 'قطعة 4' : 'Block 4'}
              value={form.blockNumber}
              onChange={e => setForm({ ...form, blockNumber: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {language === 'ar' ? 'الشارع' : 'Street'}
            </label>
            <input
              type="text"
              placeholder={language === 'ar' ? 'شارع 12' : 'Street 12'}
              value={form.streetName}
              onChange={e => setForm({ ...form, streetName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-secondary/80">
              {language === 'ar' ? 'رقم المنزل' : 'House Number'}
            </label>
            <input
              type="text"
              placeholder={language === 'ar' ? 'منزل 25' : 'House 25'}
              value={form.houseNumber}
              onChange={e => setForm({ ...form, houseNumber: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary/80">
            {language === 'ar' ? 'ملاحظات العنوان' : 'Address Notes'}
          </label>
          <textarea
            rows={2}
            placeholder={
              language === 'ar'
                ? 'بجوار مسجد الفهد، المدخل الخلفي للقاعة'
                : 'Next to Al Fahad Mosque, use the hall’s rear entrance'
            }
            value={form.addressNotes}
            onChange={e => setForm({ ...form, addressNotes: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary/80">
            {language === 'ar' ? 'ملاحظات التنفيذ' : 'Execution Notes'}
          </label>
          <textarea
            rows={2}
            placeholder={
              language === 'ar'
                ? 'يرجى وصول الفريق قبل ساعة من بدء المناسية'
                : 'Team should arrive an hour before the event starts'
            }
            value={form.executionNotes}
            onChange={e => setForm({ ...form, executionNotes: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>
      </>
      )}
    </>
  );
}
