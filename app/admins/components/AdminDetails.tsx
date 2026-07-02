'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import {
  ChevronLeft, ChevronRight, Edit2, Trash2,
  Shield, CheckCircle2, XCircle, User, Mail, Phone,
  Lock, Star, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import { getAdminById, type Admin } from '@/lib/api';

interface AdminDetailsProps {
  adminId: number;
  onBack: () => void;
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
}

export function AdminDetails({ adminId, onBack, onEdit, onDelete }: AdminDetailsProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAdminById(adminId, token)
      .then(res => setAdmin(res.data))
      .catch(err => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  }, [adminId, token]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!admin) return null;

  const isAr = dir === 'rtl';

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full text-start"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-secondary/60 hover:text-secondary transition-colors cursor-pointer group"
        >
          {dir === 'ltr'
            ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          <span className="font-medium">{t('back' as any)}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEdit(admin)}
            className="p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer"
            title={t('edit' as any)}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          {admin.can_be_deleted && (
            <button
              onClick={() => onDelete(admin)}
              className="p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer"
              title={t('remove' as any)}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Profile card ── */}
        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm lg:col-span-1 crystal-accent flex flex-col gap-6">
          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-xl overflow-hidden relative bg-primary/10 shrink-0">
              {admin.image ? (
                <Image src={admin.image} alt={admin.name} fill className="object-cover" />
              ) : (
                <User className="absolute inset-0 w-full h-full text-primary opacity-20 p-5" />
              )}
            </div>
            <div>
              <h2 className={cn('text-xl sm:text-2xl font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {admin.name}
              </h2>
              <p className="text-sm text-secondary/50 font-mono mt-0.5">#{admin.id}</p>
            </div>
          </div>

          {/* Status badges */}
          <div className="flex flex-col gap-2 items-center">
            {/* Active / Inactive */}
            <StatusBadge
              active={admin.is_active}
              activeLabel={isAr ? 'مفعّل' : 'Active'}
              inactiveLabel={isAr ? 'غير مفعّل' : 'Inactive'}
              activeColor="emerald"
              inactiveColor="red"
            />

            {/* Blocked */}
            {admin.is_blocked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200">
                <Lock className="w-3.5 h-3.5" />
                {isAr ? 'محظور' : 'Blocked'}
              </span>
            )}

            {/* Super Admin */}
            {admin.is_super_admin && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-purple-50 text-purple-700 border-purple-200">
                <Star className="w-3.5 h-3.5" />
                {isAr ? 'مدير عام' : 'Super Admin'}
              </span>
            )}

            {/* Role badge */}
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shrink-0',
              admin.is_super_admin
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-blue-50 text-blue-700 border-blue-200',
            )}>
              <Shield className="w-3.5 h-3.5" />
              {admin.role.display_name}
            </span>
          </div>

          {/* Permissions grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-secondary/8">
            <PermBadge
              allowed={admin.can_be_deleted}
              label={isAr ? 'قابل للحذف' : 'Deletable'}
            />
            <PermBadge
              allowed={admin.can_be_disabled}
              label={isAr ? 'قابل للتعطيل' : 'Disableable'}
            />
          </div>
        </div>

        {/* ── Details panel ── */}
        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm lg:col-span-2 space-y-6 crystal-accent">
          <h3 className={cn('text-lg font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('adminDetails' as any) || (isAr ? 'تفاصيل المشرف' : 'Admin Details')}
          </h3>

          {/* Contact info */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-secondary/40 uppercase tracking-wider">
              {isAr ? 'معلومات التواصل' : 'Contact Info'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField
                icon={<User className="w-4 h-4" />}
                label={t('fullName' as any) || (isAr ? 'الاسم الكامل' : 'Full Name')}
                value={admin.name}
              />
              <InfoField
                icon={<Mail className="w-4 h-4" />}
                label={t('email' as any) || (isAr ? 'البريد الإلكتروني' : 'Email')}
                value={admin.email}
                mono
              />
              {admin.full_phone ? (
                <InfoField
                  icon={<Phone className="w-4 h-4" />}
                  label={isAr ? 'الهاتف' : 'Phone'}
                  value={admin.full_phone}
                  mono
                />
              ) : (
                <InfoField
                  icon={<Phone className="w-4 h-4" />}
                  label={isAr ? 'الهاتف' : 'Phone'}
                  value="-"
                  muted
                />
              )}
            </div>
          </section>

          <div className="border-t border-secondary/8" />

          {/* Role info */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-secondary/40 uppercase tracking-wider">
              {isAr ? 'معلومات الدور' : 'Role Info'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField
                icon={<Shield className="w-4 h-4" />}
                label={isAr ? 'الدور (عربي)' : 'Role (Arabic)'}
                value={admin.role.display_name}
              />
              <InfoField
                icon={<Shield className="w-4 h-4" />}
                label={isAr ? 'الدور (إنجليزي)' : 'Role (English)'}
                value={admin.role.name}
                mono
              />
              <BoolField
                label={isAr ? 'دور مدير عام' : 'Super Admin Role'}
                value={admin.role.is_super_admin}
                isAr={isAr}
              />
              <BoolField
                label={isAr ? 'دور محمي' : 'Protected Role'}
                value={admin.role.is_protected}
                isAr={isAr}
              />
            </div>
          </section>

          <div className="border-t border-secondary/8" />

          {/* Account flags */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold text-secondary/40 uppercase tracking-wider">
              {isAr ? 'إعدادات الحساب' : 'Account Flags'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BoolField label={isAr ? 'الحساب مفعّل' : 'Account Active'} value={admin.is_active} isAr={isAr} />
              <BoolField label={isAr ? 'الحساب محظور' : 'Account Blocked'} value={admin.is_blocked} isAr={isAr} danger />
              <BoolField label={isAr ? 'مدير عام' : 'Super Admin'} value={admin.is_super_admin} isAr={isAr} />
              <BoolField label={isAr ? 'قابل للحذف' : 'Can Be Deleted'} value={admin.can_be_deleted} isAr={isAr} />
              <BoolField label={isAr ? 'قابل للتعطيل' : 'Can Be Disabled'} value={admin.can_be_disabled} isAr={isAr} />
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}

function InfoField({ icon, label, value, mono, muted }: InfoFieldProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-white/50 border border-secondary/5 space-y-1.5">
      <div className="flex items-center gap-2 text-secondary/50">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={cn(
        'font-medium text-secondary text-sm',
        mono && 'font-mono',
        muted && 'text-secondary/40 italic',
      )}>
        {value}
      </p>
    </div>
  );
}

interface BoolFieldProps {
  label: string;
  value: boolean;
  isAr: boolean;
  danger?: boolean;
}

function BoolField({ label, value, isAr, danger }: BoolFieldProps) {
  const positive = danger ? !value : value;
  return (
    <div className="p-3.5 rounded-2xl bg-white/50 border border-secondary/5 flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-secondary/60 leading-snug">{label}</span>
      <span className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0',
        positive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600',
      )}>
        {value
          ? <CheckCircle2 className="w-3 h-3" />
          : <XCircle className="w-3 h-3" />}
        {value ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}
      </span>
    </div>
  );
}

interface StatusBadgeProps {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeColor: 'emerald';
  inactiveColor: 'red';
}

function StatusBadge({ active, activeLabel, inactiveLabel }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shrink-0',
      active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
    )}>
      {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

interface PermBadgeProps {
  allowed: boolean;
  label: string;
}

function PermBadge({ allowed, label }: PermBadgeProps) {
  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border justify-center',
      allowed
        ? 'bg-emerald-50/60 text-emerald-700 border-emerald-100'
        : 'bg-secondary/5 text-secondary/40 border-secondary/10',
    )}>
      {allowed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {label}
    </div>
  );
}
