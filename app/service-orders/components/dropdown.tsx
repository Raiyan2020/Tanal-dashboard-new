import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropdownProps<T> {
  value: string;
  placeholder: string;
  label: (item: T) => React.ReactNode;
  sublabel: (item: T) => React.ReactNode;
  items: T[];
  filterFn: (item: T, q: string) => boolean;
  onSelect: (item: T) => void;
  /** Items that are still listed but cannot be picked — e.g. already used elsewhere. */
  isDisabled?: (item: T) => boolean;
  /** Reason shown beside a disabled item. */
  disabledHint?: string;
}

export function Dropdown<T extends { id: string | number }>({
  value, placeholder, label, sublabel, items, filterFn, onSelect,
  isDisabled, disabledHint,
}: DropdownProps<T>) {
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = q ? items.filter(i => filterFn(i, q)) : items;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-white/50 border border-white/60 hover:border-primary/40 outline-none transition-all text-sm cursor-pointer">
        <span className={cn('text-start truncate', value ? 'text-secondary' : 'text-secondary/40')}>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-secondary/40 shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setQ(''); }} />
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="absolute top-full mt-1 left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-secondary/10 overflow-hidden">
              <div className="p-2 border-b border-secondary/10">
                <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchDropdown') || 'Search...'}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-secondary/5 outline-none" />
              </div>
              <div className="max-h-52 overflow-y-auto py-1">
                {filtered.map(item => {
                  const disabled = isDisabled?.(item) ?? false;
                  return (
                    <button key={item.id} type="button"
                      disabled={disabled}
                      title={disabled ? disabledHint : undefined}
                      onClick={() => { onSelect(item); setOpen(false); setQ(''); }}
                      className={cn("w-full px-3 py-2.5 text-sm flex items-center gap-3 transition-colors",
                        dir === 'rtl' ? 'text-right' : 'text-left',
                        disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-secondary/5 cursor-pointer')}>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-secondary truncate">{label(item)}</div>
                        <div className="text-xs text-secondary/50 truncate">
                          {disabled && disabledHint ? disabledHint : sublabel(item)}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && <p className="text-center text-secondary/40 text-xs py-4">{t('noResults') || 'No results'}</p>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
