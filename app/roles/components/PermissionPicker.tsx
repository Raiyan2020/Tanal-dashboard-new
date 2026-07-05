'use client';

import React, { useState, useEffect } from 'react';
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
  const { t, dir, language } = useLanguage();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Collect dashboard permission IDs that are missing from selected Set
    const dashIds: number[] = [];
    groups.forEach(g => {
      if (g.module === 'dashboard') {
        g.permissions.forEach(p => {
          if (!selected.has(p.id)) {
            dashIds.push(p.id);
          }
        });
      }
    });
    if (dashIds.length > 0) {
      const next = new Set(selected);
      dashIds.forEach(id => next.add(id));
      onChange(next);
    }
  }, [groups, selected, onChange]);

  const toggle = (id: number, isDashboard?: boolean) => {
    if (isDashboard) return;
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange(next);
  };

  const toggleGroup = (group: PermissionGroup) => {
    if (group.module === 'dashboard') return;
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

  const clearAll = () => {
    const next = new Set<number>();
    groups.forEach(g => {
      if (g.module === 'dashboard') {
        g.permissions.forEach(p => next.add(p.id));
      }
    });
    onChange(next);
  };

  const filtered = search.trim()
    ? groups.map(g => ({
      ...g,
      permissions: g.permissions.filter(p =>
        (language === 'ar' ? p.label_ar : p.label_en).toLowerCase().includes(search.toLowerCase()) ||
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
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-secondary/40">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-funnel-x-icon lucide-funnel-x"><path d="M12.531 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l.427-.473" /><path d="m16.5 3.5 5 5" /><path d="m21.5 3.5-5 5" /></svg>
            <p className="text-sm font-medium">{dir === 'rtl' ? 'لا توجد صلاحيات مطابقة' : 'No matching permissions found'}</p>
            <p className="text-xs">{dir === 'rtl' ? 'جرب كلمة بحث مختلفة' : 'Try a different search term'}</p>
          </div>
        ) : filtered.map(group => {
          const groupIds = group.permissions.map(p => p.id);
          const checkedCount = groupIds.filter(id => selected.has(id)).length;
          const allChecked = checkedCount === groupIds.length;
          const someChecked = checkedCount > 0 && !allChecked;
          const isOpen = openGroups.has(group.module);
          const isDashGroup = group.module === 'dashboard';

          return (
            <div key={group.module} className="rounded-2xl border border-secondary/8 bg-white/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/50 transition-colors select-none">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  disabled={isDashGroup}
                  className={cn("flex items-center gap-2", isDashGroup ? "cursor-not-allowed opacity-80" : "cursor-pointer")}
                >
                  <span className={cn(
                    'w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-colors',
                    allChecked ? 'bg-primary border-primary' : someChecked ? 'bg-primary/40 border-primary/60' : 'border-secondary/30 bg-white'
                  )}>
                    {allChecked && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                    {someChecked && <Square className="w-3.5 h-3.5 text-primary" />}
                  </span>
                  <span className="font-medium text-sm text-secondary">
                    {language === 'ar' ? group.module_label_ar : group.module_label_en}
                  </span>
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
                      {group.permissions.map(perm => {
                        const isDash = perm.module === 'dashboard' || perm.name === 'dashboard';
                        return (
                          <button
                            key={perm.id}
                            type="button"
                            onClick={() => toggle(perm.id, isDash)}
                            disabled={isDash}
                            className={cn(
                              'flex items-center gap-2.5 p-2.5 rounded-xl border text-sm transition-all text-start',
                              isDash
                                ? 'bg-primary/5 border-primary/20 text-primary/70 cursor-not-allowed opacity-80'
                                : selected.has(perm.id)
                                  ? 'bg-primary/8 border-primary/30 text-primary cursor-pointer'
                                  : 'bg-white/50 border-secondary/10 text-secondary/70 hover:border-secondary/20 hover:bg-white/70 cursor-pointer'
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
                            <span className="flex-1 leading-snug">
                              {language === 'ar' ? perm.label_ar : perm.label_en}
                            </span>
                            {isDash ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/75 shrink-0"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            ) : (
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0', actionColor(perm.action))}>
                                {perm.action}
                              </span>
                            )}
                          </button>
                        );
                      })}
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
