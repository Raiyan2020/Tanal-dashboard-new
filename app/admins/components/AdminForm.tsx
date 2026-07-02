'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import { getAdminById, createAdmin, updateAdmin, type Admin, type Role } from '@/lib/api';
import { ToggleSwitch } from './ToggleSwitch';

interface AdminFormProps {
  adminId: number | null;
  roles: Role[];
  rolesLoading: boolean;
  onBack: () => void;
  onSaved: (admin: Admin) => void;
}

export function AdminForm({ adminId, roles, rolesLoading, onBack, onSaved }: AdminFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  const [fetchedAdmin, setFetchedAdmin] = useState<Admin | null>(null);
  const [fetchLoading, setFetchLoading] = useState(adminId !== null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adminId === null) return;
    setFetchLoading(true);
    getAdminById(adminId, token)
      .then(res => {
        const a = res.data;
        setFetchedAdmin(a);
        setName(a.name);
        setEmail(a.email);
        setIsActive(a.is_active);
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setFetchLoading(false));
  }, [adminId, token]);

  useEffect(() => {
    if (fetchedAdmin && roles.length > 0 && roleId === '') {
      const match = roles.find(r => r.id === fetchedAdmin.role.id);
      if (match) setRoleId(match.id);
    }
  }, [roles, fetchedAdmin, roleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roleId === '') { toast.error('يرجى اختيار الدور'); return; }
    setLoading(true);
    try {
      let res;
      if (adminId !== null) {
        res = await updateAdmin(
          adminId,
          { name, email, ...(password ? { password } : {}), role_id: roleId, is_active: isActive ? 1 : 0 },
          token,
        );
      } else {
        if (!password) { toast.error('كلمة المرور مطلوبة'); setLoading(false); return; }
        res = await createAdmin(
          { name, email, password, role_id: roleId, is_active: isActive ? 1 : 0 },
          token,
        );
      }
      toast.success(res.msg);
      onSaved(res.data);
    } catch (err) {
      toast.error((err as Error).message ?? 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
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
      <div className="flex items-center justify-start mb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
        >
          {dir === 'ltr'
            ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          <span className="font-medium">{t('back' as any)}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn('text-2xl font-medium text-secondary mb-8', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {adminId !== null ? t('editAdmin' as any) : t('addAdmin' as any)}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('fullName' as any) || 'Full Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('email' as any) || 'Email'} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('password' as any) || 'Password'} {adminId === null && <span className="text-red-500">*</span>}
              {adminId !== null && <span className="text-xs text-secondary/40 ms-2">(اتركه فارغاً إن لم تريد تغييره)</span>}
            </label>
            <input
              type="password"
              required={adminId === null}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
              {t('role' as any) || 'Role'} <span className="text-red-500">*</span>
            </label>
            {rolesLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-secondary/50 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> جاري التحميل...
              </div>
            ) : (
              <select
                value={roleId}
                onChange={e => setRoleId(Number(e.target.value))}
                required
                className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none"
              >
                <option value="">-- اختر الدور --</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-2">
            <ToggleSwitch
              checked={isActive}
              onChange={setIsActive}
              label={isActive ? (t('active' as any) || 'Active') : (t('inactive' as any) || 'Inactive')}
            />
          </div>

          <div className="pt-4 border-t border-secondary/10 mt-8">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : t('saveChanges' as any) || 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
