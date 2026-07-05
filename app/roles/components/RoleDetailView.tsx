'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, ShieldCheck, Users, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import { getRoleById, type Role, type RoleDetail } from '@/lib/api';
import { actionColor } from './shared';

interface RoleDetailViewProps {
  roleId: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (role: Role) => void;
}

export function RoleDetailView({ roleId, onBack, onEdit, onDelete }: RoleDetailViewProps) {
  const { t, dir, language } = useLanguage();
  const token = getToken() ?? '';
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRoleById(roleId, token)
      .then(res => setRole(res.data))
      .catch(err => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [roleId, token]);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!role) return null;

  const displayName = language === 'ar' ? role.name_ar : role.name_en;

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full text-start"
    >
      <div className="flex items-center justify-between mb-2">
        <button onClick={onBack} className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group">
          {dir === 'ltr'
            ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          <span className="font-medium">{t('back' as any)}</span>
        </button>
        <div className="flex gap-2">
          {role.can_be_edited && (
            <button onClick={onEdit}
              className="p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:-translate-y-[2px] hover:shadow-md active:scale-95 rounded-xl transition-all cursor-pointer">
              <Edit2 className="w-5 h-5" />
            </button>
          )}
          {role.can_be_deleted && (
            <button onClick={() => onDelete(role)}
              className="p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:-translate-y-[2px] hover:shadow-md active:scale-95 rounded-xl transition-all cursor-pointer">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm crystal-accent">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className={cn('text-2xl font-bold text-secondary', dir === 'rtl' ? 'font-arabic' : 'font-serif')}>{displayName}</h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-secondary/60 bg-secondary/8 px-3 py-1 rounded-full">
                <Users className="w-4 h-4" /> {role.admins_count} {t('adminCount')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-secondary/60 bg-secondary/8 px-3 py-1 rounded-full">
                <Lock className="w-4 h-4" /> {role.permissions_count} {t('permissionCount')}
              </span>
              {role.is_super_admin && (
                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">{t('superAdmin')}</span>
              )}
              {role.is_protected && (
                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">{t('protected')}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm crystal-accent">
        <h3 className={cn('text-lg font-semibold text-secondary mb-6', dir === 'rtl' ? 'font-arabic' : 'font-serif')}>{t('grantedPermissions')}</h3>
        <div className="space-y-5">
          {role.permissions.map(group => {
            const moduleLabel = language === 'ar' ? group.module_label_ar : group.module_label_en;
            return (
              <div key={group.module}>
                <p className="text-xs font-semibold text-secondary/40 uppercase tracking-widest mb-2">{moduleLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {group.permissions.map(p => {
                    const permLabel = language === 'ar' ? p.label_ar : p.label_en;
                    return (
                      <span key={p.id} className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', actionColor(p.action))}>
                        {permLabel}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
