import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';
import { type FormState, type OrderFormErrors } from '@/lib/service-order-form';
import { MapLocationPicker } from '@/components/map-location-picker';

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

/** Hour options shared by the start and end time selects. */
const HOURS = Array.from({ length: 24 }, (_, h) => h);

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

  const hourLabel = (h: number) => {
    const period = h < 12 ? (language === 'ar' ? 'ص' : 'AM') : (language === 'ar' ? 'م' : 'PM');
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${String(hour12).padStart(2, '0')}:00 ${period}`;
  };
  const hourValue = (h: number) => `${String(h).padStart(2, '0')}:00`;

  // End time is picked relative to the start, so it stays locked until a start
  // hour exists and only offers the hours after it.
  const startHour = /^(\d{1,2}):/.exec(form.time)
    ? Number(/^(\d{1,2}):/.exec(form.time)![1])
    : null;
  const endDisabled = startHour === null;
  // An already-saved order may carry a start with no hour after it (edit mode
  // skips `onStartChange`), which would render an end dropdown with no options.
  const noEndSlots = startHour !== null && !HOURS.some(h => h > startHour);

  /** Picking a start time drops an end time that is no longer after it. */
  const onStartChange = (value: string) => {
    const next = /^(\d{1,2}):/.exec(value);
    const nextStart = next ? Number(next[1]) : null;

    // The end list only offers hours *after* the start, so the last hour of the
    // day leaves it empty. Refuse the pick instead of opening a dropdown with
    // nothing in it — clearing the start keeps the end select disabled.
    // Quick mode never asks for an end time, so the limit does not apply there.
    if (!quick && nextStart !== null && !HOURS.some(h => h > nextStart)) {
      toast.error(
        language === 'ar'
          ? 'لا توجد أوقات انتهاء متاحة بعد هذا الوقت، يرجى اختيار وقت بدء أبكر'
          : 'No end times are available after this start time — pick an earlier start time.'
      );
      setForm({ ...form, time: '', endTime: '' });
      return;
    }

    const currentEnd = /^(\d{1,2}):/.exec(form.endTime);
    const stale =
      nextStart === null ||
      (currentEnd !== null && Number(currentEnd[1]) <= nextStart);
    setForm({ ...form, time: value, endTime: stale ? '' : form.endTime });
  };

  const errorText = 'text-xs text-red-500 mt-0.5';
  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm placeholder:text-secondary/40';

  const displayDate = form.date
    ? parseLocalDate(form.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      {/* Date */}
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
            value={form.time}
            onChange={e => onStartChange(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm cursor-pointer"
          >
            <option value="">{language === 'ar' ? 'اختر الوقت...' : 'Select time...'}</option>
            {HOURS.map(h => (
              <option key={h} value={hourValue(h)}>{hourLabel(h)}</option>
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
            {/* Only hours after the start are offered — 04:00 PM cannot end a 06:00 PM event. */}
            {HOURS.filter(h => startHour !== null && h > startHour).map(h => (
              <option key={h} value={hourValue(h)}>{hourLabel(h)}</option>
            ))}
          </select>
          {errors.event_end_time && <p className={errorText}>{errors.event_end_time}</p>}
        </div>
        )}
      </div>

      {/* Hall + address — quick mode defers all of this to the client's form */}
      {quick ? null : (
      <>
      {/* Hall */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-secondary/80">
          {t('hallName') || 'Hall Name'} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          placeholder={
            language === 'ar'
              ? 'فندق الفيصلية - قاعة الاحتفالات الكبرى'
              : 'Al Faisaliah Hotel – Grand Ballroom'
          }
          value={form.hallName}
          onChange={e => setForm({ ...form, hallName: e.target.value })}
          className={inputClass}
        />
        {errors.hall_name && <p className={errorText}>{errors.hall_name}</p>}
      </div>

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
                ? 'يرجى وصول الفريق قبل ساعة من بدء الحفل'
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
