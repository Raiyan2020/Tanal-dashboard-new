import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';
import { createEventGuest, updateEventGuest } from '@/lib/api';
import { COUNTRIES } from '@/app/clients/_client-form';
import { toast } from 'sonner';

export interface Guest {
  id: string;
  name: string;
  phone: string;
  hasWhatsapp: boolean;
  invitationSent: boolean;
  checkedIn: boolean;
}

export interface GuestEditFormProps {
  guest?: Guest | null;
  eventId: number;
  token: string;
  onBack: () => void;
  onSave: (guest: Guest) => void;
}

export function GuestEditForm({ guest, eventId, token, onBack, onSave }: GuestEditFormProps) {
  const { dir } = useLanguage();
  const [name, setName] = useState(guest?.name || '');
  const [phoneExt, setPhoneExt] = useState(() => {
    const match = guest?.phone?.match(/^(\+\d+)/);
    return match ? match[1] : '+965';
  });
  const [phoneStr, setPhoneStr] = useState(
    guest?.phone ? guest.phone.replace(/^\+\d+\s*/, '') : ''
  );
  const [submitting, setSubmitting] = useState(false);

  const countryCode = phoneExt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Edit mode: call API
    if (guest) {
      setSubmitting(true);
      try {
        const res = await updateEventGuest(
          eventId,
          Number(guest.id),
          { name, phone: phoneStr, country_code: countryCode },
          token
        );
        onSave({
          ...guest,
          name,
          phone: `${countryCode} ${phoneStr}`,
          hasWhatsapp: res.data?.have_whatsapp ?? guest.hasWhatsapp,
        });
        toast.success(res.msg || (dir === 'ltr' ? 'Guest updated successfully' : 'تم تحديث الضيف بنجاح'));
      } catch (err) {
        toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to update guest' : 'حدث خطأ أثناء تحديث الضيف'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Create mode: call API
    setSubmitting(true);
    try {
      const res = await createEventGuest(
        eventId,
        { name, phone: phoneStr, country_code: countryCode },
        token
      );
      const newGuest: Guest = {
        id: String(res.data.id),
        name,
        phone: `${countryCode} ${phoneStr}`,
        hasWhatsapp: res.data.have_whatsapp,
        invitationSent: false,
        checkedIn: false,
      };
      toast.success(res.msg || (dir === 'ltr' ? 'Guest added successfully' : 'تم إضافة الضيف بنجاح'));
      onSave(newGuest);
    } catch (err) {
      toast.error((err as Error).message || (dir === 'ltr' ? 'Failed to add guest' : 'حدث خطأ أثناء إضافة الضيف'));
    } finally {
      setSubmitting(false);
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
          <span className="font-medium">{dir === 'ltr' ? 'Back' : 'الرجوع'}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {guest ? (dir === 'ltr' ? 'Edit Guest' : 'تعديل بيانات الضيف') : (dir === 'ltr' ? 'Add Guest' : 'إضافة ضيف')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 rtl:mr-1 rtl:ml-0">
              {dir === 'ltr' ? 'Full Name' : 'الاسم الكامل'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
              placeholder={dir === 'ltr' ? 'Full Name' : 'الاسم الكامل'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary/80 mb-1.5 ml-1 rtl:mr-1 rtl:ml-0">
              {dir === 'ltr' ? 'Phone Number' : 'رقم الهاتف'}
            </label>
            <div className="flex gap-2">
              <div className="relative shrink-0 w-[140px]">
                <select
                  value={phoneExt}
                  onChange={e => setPhoneExt(e.target.value)}
                  className="w-full appearance-none bg-white/50 border border-secondary/20 rounded-xl py-3 ps-3 pe-8 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary text-sm font-medium h-full cursor-pointer"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.iso} value={c.code}>
                      {c.flag} {c.code} ({dir === 'ltr' ? c.name : c.nameAr})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 end-0 flex items-center pe-2.5 pointer-events-none text-secondary/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>

              <input
                type="tel"
                required
                value={phoneStr}
                onChange={e => setPhoneStr(e.target.value)}
                className="flex-1 min-w-0 bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary text-left font-mono"
                placeholder="5x xxx xxxx"
                dir="ltr"
              />
            </div>
            <p className="text-xs text-secondary/50 mt-1.5 ml-1 rtl:mr-1 rtl:ml-0 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {dir === 'ltr' ? 'Phone number must have WhatsApp' : 'يجب أن يكون الرقم مرتبطاً بواتساب'}
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3 border-t border-secondary/10 mt-8 w-full">
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {dir === 'ltr' ? 'Saving...' : 'جاري الحفظ...'}
                </>
              ) : (
                dir === 'ltr' ? 'Save Changes' : 'حفظ التغييرات'
              )}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-3.5 rounded-xl text-secondary hover:bg-secondary/5 font-medium transition-colors cursor-pointer"
            >
              {dir === 'ltr' ? 'Cancel' : 'إلغاء'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
