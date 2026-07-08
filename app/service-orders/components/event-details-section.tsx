import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { DayPicker } from '@daypicker/react';
import '@daypicker/react/dist/style.css';
import { ar } from 'date-fns/locale';
import { type FormState } from './order-form';

interface EventDetailsSectionProps {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  tomorrow: string;
}

export function EventDetailsSection({
  form,
  setForm,
  tomorrow,
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

  const minDate = new Date(tomorrow); // dates before tomorrow are disabled
  const selectedDate = form.date ? new Date(form.date) : undefined;

  const displayDate = form.date
    ? new Date(form.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <>
      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-4">
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
                  disabled={{ before: minDate }}
                  locale={dir === 'rtl' ? ar : undefined}
                  dir={dir}
                />
              </div>
            )}
          </div>
        </div>

        {/* Time */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
            <Clock className="w-4 h-4 text-secondary/40" /> {t('eventTime') || 'Event Time'} <span className="text-red-500">*</span>
          </label>
          <select
            required
            value={form.time}
            onChange={e => setForm({ ...form, time: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm cursor-pointer"
          >
            <option value="">{language === 'ar' ? 'اختر الوقت...' : 'Select time...'}</option>
            {Array.from({ length: 24 }, (_, h) => {
              const period = h < 12 ? (language === 'ar' ? 'ص' : 'AM') : (language === 'ar' ? 'م' : 'PM');
              const hour12 = h % 12 === 0 ? 12 : h % 12;
              const label = `${String(hour12).padStart(2, '0')}:00 ${period}`;
              const value = `${String(h).padStart(2, '0')}:00`;
              return <option key={value} value={value}>{label}</option>;
            })}
          </select>
        </div>
      </div>

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
          className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm"
        />
      </div>

      {/* Hall Location */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-secondary/80">
          <MapPin className="w-4 h-4 text-secondary/40" /> {t('hallLocationLink') || 'Hall Location Map Link'}
        </label>
        <input
          type="url"
          placeholder="https://maps.google.com/…"
          value={form.hallLocation}
          dir="ltr"
          onChange={e => setForm({ ...form, hallLocation: e.target.value })}
          className="w-full px-4 py-3 rounded-xl bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none text-secondary text-sm font-mono text-left"
        />
      </div>
    </>
  );
}
