'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { AnimatePresence, motion } from 'motion/react';
import { Search, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PermissionGroup } from '@/lib/api';
import { actionColor } from './shared';

interface PermPickerProps {
  groups: PermissionGroup[];
  selected: Set<number>;
  onChange: (s: Set<number>) => void;
}

export function PermissionPicker({ groups, selected, onChange }: PermPickerProps) {
  const { t } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const toggleGroup = (group: PermissionGroup) => {
    const ids = group.permissions.map(p => p.id);
    const allOn = ids.every(id => selected.has(id));
    const next = new Set(selected);
    if (allOn) ids.forEach(id => next.delete(id));
    else ids.forEach(id => next.add(id));
    onChange(next);
  };

  const toggleCollapse = (mod: string) => {
    const next = new Set(openGroups);
    next.has(mod) ? next.delete(mod) : next.add(mod);
    setOpenGroups(next);
  };

  const selectAll = () => {
    const all = groups.flatMap(g => g.permissions.map(p => p.id));
    onChange(new Set(all));
  };
  const clearAll = () => onChange(new Set());

  const filtered = search.trim()
    ? groups.map(g => ({
        ...g,
        permissions: g.permissions.filter(p =>
          p.label.toLowerCase().includes(search.toLowerCase()) ||
          p.action.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(g => g.permissions.length > 0)
    : groups;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40" />
          <input
            type="text"
            placeholder={t('searchPermissions')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/50 border border-secondary/20 rounded-xl ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
        <button type="button" onClick={selectAll} className="text-xs px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer font-medium">
          {t('selectAll')}
        </button>
        <button type="button" onClick={clearAll} className="text-xs px-3 py-2 rounded-xl bg-secondary/8 text-secondary/70 hover:bg-secondary/15 transition-colors cursor-pointer font-medium">
          {t('clearAll')}
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {filtered.map(group => {
          const groupIds = group.permissions.map(p => p.id);
          const checkedCount = groupIds.filter(id => selected.has(id)).length;
          const allChecked = checkedCount === groupIds.length;
          const someChecked = checkedCount > 0 && !allChecked;
          const isOpen = openGroups.has(group.module);

          return (
            <div key={group.module} className="rounded-2xl border border-secondary/8 bg-white/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/50 transition-colors select-none">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className={cn(
                    'w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                    allChecked ? 'bg-primary border-primary' : someChecked ? 'bg-primary/40 border-primary/60' : 'border-secondary/30 bg-white'
                  )}>
                    {allChecked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    {someChecked && <Square className="w-3.5 h-3.5 text-primary" />}
                  </span>
                  <span className="font-medium text-sm text-secondary">{group.label}</span>
                  <span className="text-xs text-secondary/40 bg-secondary/8 px-2 py-0.5 rounded-full">
                    {checkedCount}/{groupIds.length}
                  </span>
                </button>
                <button type="button" onClick={() => toggleCollapse(group.module)} className="p-1 rounded-lg hover:bg-secondary/10 transition-colors cursor-pointer">
                  {isOpen ? <ChevronUp className="w-4 h-4 text-secondary/50" /> : <ChevronDown className="w-4 h-4 text-secondary/50" />}
                </button>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-secondary/8 pt-3">
                      {group.permissions.map(perm => (
                        <button
                          key={perm.id}
                          type="button"
                          onClick={() => toggle(perm.id)}
                          className={cn(
                            'flex items-center gap-2.5 p-2.5 rounded-xl border text-sm transition-all cursor-pointer text-start',
                            selected.has(perm.id)
                              ? 'bg-primary/8 border-primary/30 text-primary'
                              : 'bg-white/50 border-secondary/10 text-secondary/70 hover:border-secondary/20 hover:bg-white/70'
                          )}
                        >
                          <span className={cn(
                            'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                            selected.has(perm.id) ? 'bg-primary border-primary' : 'border-secondary/30 bg-white'
                          )}>
                            {selected.has(perm.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="flex-1 leading-snug">{perm.label}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0', actionColor(perm.action))}>
                            {perm.action}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-secondary/40 text-end">{selected.size} {t('selectedPermissions')}</p>
    </div>
  );
}
