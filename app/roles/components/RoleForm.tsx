'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getRoleById, createRole, updateRole, getPermissions,
  type PermissionGroup,
} from '@/lib/api';
import { PermissionPicker } from './PermissionPicker';

interface RoleFormProps {
  roleId: number | null;
  onBack: () => void;
  onSaved: () => void;
}

export function RoleForm({ roleId, onBack, onSaved }: RoleFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [permLoading, setPermLoading] = useState(true);
  const [fetchLoading, setFetchLoading] = useState(roleId !== null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPermLoading(true);
    getPermissions(token)
      .then(res => setPermGroups(res.data.items))
      .catch(err => toast.error((err as Error).message))
      .finally(() => setPermLoading(false));
  }, [token]);

  useEffect(() => {
    if (roleId === null) return;
    setFetchLoading(true);
    getRoleById(roleId, token)
      .then(res => {
        const r = res.data;
        setNameAr(r.name_ar);
        setNameEn(r.name_en);
        setSelected(new Set(r.permissions.map(p => p.id)));
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setFetchLoading(false));
  }, [roleId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) { toast.error(t('nameArRequired')); return; }
    if (!nameEn.trim()) { toast.error(t('nameEnRequired')); return; }
    if (selected.size === 0) { toast.error(t('atLeastOnePermission')); return; }
    setSaving(true);
    try {
      const fields = { nameAr, nameEn, permissionIds: Array.from(selected) };
      const res = roleId !== null
        ? await updateRole(roleId, fields, token)
        : await createRole(fields, token);
      toast.success(res.msg);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (fetchLoading || permLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full text-start"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
      >
        {dir === 'ltr'
          ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
        <span className="font-medium">{t('back' as any)}</span>
      </button>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn('text-2xl font-medium text-secondary mb-8', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {roleId !== null ? t('editRole') : t('addNewRole')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary/80">{t('nameAr')} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={e => setNameAr(e.target.value)}
                dir="rtl"
                className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
                placeholder="مدير"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary/80">{t('nameEn')} <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={e => setNameEn(e.target.value)}
                dir="ltr"
                className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
                placeholder="Manager"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80">{t('permissions')} <span className="text-red-500">*</span></label>
            <PermissionPicker groups={permGroups} selected={selected} onChange={setSelected} />
          </div>

          <div className="pt-4 border-t border-secondary/10">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : t('saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
