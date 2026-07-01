'use client';

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Shield, CheckCircle2, XCircle, User, Mail, Loader2 } from 'lucide-react';
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

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full text-start"
    >
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm md:col-span-1 crystal-accent">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-xl overflow-hidden mb-4 relative bg-primary/10">
              {admin.image ? (
                <Image src={admin.image} alt={admin.name} fill className="object-cover" />
              ) : (
                <User className="absolute inset-0 w-full h-full text-primary opacity-20 p-4" />
              )}
            </div>
            <h2 className={cn('text-xl sm:text-2xl font-semibold text-secondary mb-1', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {admin.name}
            </h2>
            <div className="flex flex-col gap-2 mt-4 items-center">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shrink-0',
                admin.is_super_admin ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200',
              )}>
                <Shield className="w-3.5 h-3.5" />
                {admin.role.display_name}
              </span>
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shrink-0',
                admin.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
              )}>
                {admin.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {admin.is_active ? (t('active' as any) || 'Active') : (t('inactive' as any) || 'Inactive')}
              </span>
              {admin.is_blocked && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-orange-50 text-orange-700 border-orange-200">
                  <XCircle className="w-3.5 h-3.5" />
                  محظور
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm md:col-span-2 space-y-6 crystal-accent">
          <h3 className={cn('text-lg font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('adminDetails' as any) || 'Admin Details'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoField icon={<User className="w-4 h-4" />} label={t('fullName' as any) || 'Full Name'} value={admin.name} />
            <InfoField icon={<Mail className="w-4 h-4" />} label={t('email' as any) || 'Email'} value={admin.email} mono />
            <InfoField icon={<Shield className="w-4 h-4" />} label={t('role' as any) || 'Role'} value={admin.role.display_name} />
            {admin.full_phone && (
              <InfoField icon={<Mail className="w-4 h-4" />} label="الهاتف" value={admin.full_phone} mono />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}

function InfoField({ icon, label, value, mono }: InfoFieldProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-secondary/60 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className={cn(mono && 'font-mono text-sm')}>
        {value}
      </p>
    </div>
  );
}
