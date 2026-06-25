'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Eye, Edit2, Trash2, UserSearch,
  XCircle, CheckCircle2, ChevronLeft, ChevronRight,
  User, Mail, Shield, AlertTriangle, Loader2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getAdmins, getAdminById, createAdmin, updateAdmin, deleteAdmin, getRoles,
  type Admin, type Role, type PaginatedItems,
} from '@/lib/api';

/* ─── Per-page options ─────────────────────────────────────────── */
const PER_PAGE_OPTIONS = [10, 15, 25, 50];

/* ─── Toggle Switch ────────────────────────────────────────────── */
function ToggleSwitch({
  checked, onChange, label, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed')}>
      <span className="text-sm font-medium text-secondary/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30',
          checked ? 'bg-primary' : 'bg-secondary/20',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </label>
  );
}

/* ─── Admin Form (Create / Edit) ───────────────────────────────── */
interface AdminFormProps {
  /** null = create mode, number = edit mode (fetches fresh data) */
  adminId: number | null;
  roles: Role[];
  rolesLoading: boolean;
  onBack: () => void;
  onSaved: (admin: Admin) => void;
}

function AdminForm({ adminId, roles, rolesLoading, onBack, onSaved }: AdminFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  // fetched admin data (edit mode)
  const [fetchedAdmin, setFetchedAdmin] = useState<Admin | null>(null);
  const [fetchLoading, setFetchLoading] = useState(adminId !== null);

  // form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  // fetch admin data in edit mode
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
        // roleId will be synced once roles arrive
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setFetchLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId]);

  // sync roleId once both roles and fetched admin are available
  useEffect(() => {
    if (fetchedAdmin && roles.length > 0 && roleId === '') {
      const match = roles.find(r => r.name === fetchedAdmin.role.name);
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

  // show spinner while loading admin data for edit
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
      className="space-y-6 pb-10 w-full"
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
          {/* Name */}
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

          {/* Email */}
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

          {/* Password */}
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

          {/* Role */}
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

          {/* is_active switch */}
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

/* ─── Admin Details View ───────────────────────────────────────── */
interface AdminDetailsProps {
  adminId: number;
  onBack: () => void;
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
}

function AdminDetails({ adminId, onBack, onEdit, onDelete }: AdminDetailsProps) {
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
      className="space-y-6 pb-10 w-full"
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
            className="p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer"
            title={t('edit' as any)}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          {admin.can_be_deleted && (
            <button
              onClick={() => onDelete(admin)}
              className="p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer"
              title={t('remove' as any)}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Avatar card */}
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

        {/* Details card */}
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

function InfoField({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-secondary/60 mb-1">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className={cn('text-secondary font-medium pl-6 rtl:pr-6 rtl:pl-0', mono && 'font-mono text-sm')} dir={mono ? 'ltr' : undefined}>
        {value}
      </p>
    </div>
  );
}

/* ─── Delete Modal ─────────────────────────────────────────────── */
interface DeleteModalProps {
  admin: Admin;
  onClose: () => void;
  onConfirmed: () => void;
}

function DeleteAdminModal({ admin, onClose, onConfirmed }: DeleteModalProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await deleteAdmin(admin.id, token);
      toast.success((res as any).msg ?? 'تم الحذف بنجاح');
      onConfirmed();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm p-4 bg-black/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm glass-panel crystal-accent rounded-3xl relative z-10 overflow-hidden shadow-2xl"
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className={cn('text-xl font-semibold text-secondary mb-2', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('deleteAdminTitle' as any) || 'حذف المسؤول'}
          </h3>
          <p className="text-secondary/70 mb-2">
            {t('deleteAdminMessage' as any) || 'هل أنت متأكد أنك تريد حذف هذا المسؤول؟'}
          </p>
          <p className="text-sm font-semibold text-secondary mb-8">{admin.name}</p>
          <div className="w-full flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-white/50 hover:bg-white/80 text-secondary border border-white/60 rounded-xl py-3 font-medium transition-all shadow-sm cursor-pointer"
            >
              {t('cancel' as any) || 'إلغاء'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('remove' as any) || 'حذف'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Pagination ───────────────────────────────────────────────── */
function Pagination({
  pagination, onPage,
}: {
  pagination: PaginatedItems<Admin>['pagination'];
  onPage: (p: number) => void;
}) {
  const { last_page, current_page } = pagination;
  if (last_page <= 1) return null;

  const pages = Array.from({ length: last_page }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
      <button
        onClick={() => onPage(current_page - 1)}
        disabled={current_page === 1}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={cn(
            'w-9 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer',
            p === current_page
              ? 'bg-primary text-white shadow-md'
              : 'bg-white/50 border border-secondary/10 hover:bg-white/80 text-secondary',
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(current_page + 1)}
        disabled={current_page === last_page}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */
type View = 'list' | 'view' | 'form';

export default function AdminsPage() {
  const { t, dir } = useLanguage();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    setToken(getToken() ?? '');
  }, []);

  // ── list state ──
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [pagination, setPagination] = useState<PaginatedItems<Admin>['pagination'] | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── roles state ──
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // ── view state ──
  const [view, setView] = useState<View>('list');
  const [viewAdminId, setViewAdminId] = useState<number | null>(null);
  const [editAdmin, setEditAdmin] = useState<number | null>(null);
  const [deleteAdmin_, setDeleteAdmin_] = useState<Admin | null>(null);

  /* ── fetch admins ── */
  const fetchAdmins = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const res = await getAdmins(token, { page, per_page: perPage, keyword: keyword || undefined });
      setAdmins(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setListLoading(false);
    }
  }, [token, page, perPage, keyword]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  /* ── fetch roles ── */
  useEffect(() => {
    if (!token) return;
    setRolesLoading(true);
    getRoles(token)
      .then(res => setRoles(res.data.items))
      .catch(err => toast.error((err as Error).message))
      .finally(() => setRolesLoading(false));
  }, [token]);

  /* ── debounced search ── */
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
    }, 500);
  };

  /* ── on admin saved (create/edit) ── */
  const handleSaved = (_admin: Admin) => {
    setView('list');
    setEditAdmin(null);
    fetchAdmins();
  };

  /* ── on admin deleted ── */
  const handleDeleted = () => {
    setDeleteAdmin_(null);
    if (view === 'view') setView('list');
    fetchAdmins();
  };

  /* ── views ── */
  if (view === 'form') {
    return (
      <AnimatePresence mode="wait">
        <AdminForm
          key={`form-${editAdmin ?? 'new'}`}
          adminId={editAdmin}
          roles={roles}
          rolesLoading={rolesLoading}
          onBack={() => { setView('list'); setEditAdmin(null); }}
          onSaved={handleSaved}
        />
      </AnimatePresence>
    );
  }

  if (view === 'view' && viewAdminId !== null) {
    return (
      <>
        <AnimatePresence mode="wait">
          <AdminDetails
            key={`view-${viewAdminId}`}
            adminId={viewAdminId}
            onBack={() => { setView('list'); setViewAdminId(null); }}
            onEdit={(a) => { setEditAdmin(a.id); setView('form'); setViewAdminId(null); }}
            onDelete={(a) => setDeleteAdmin_(a)}
          />
        </AnimatePresence>
        <AnimatePresence>
          {deleteAdmin_ && (
            <DeleteAdminModal
              admin={deleteAdmin_}
              onClose={() => setDeleteAdmin_(null)}
              onConfirmed={handleDeleted}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 pb-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('admins' as any) || 'المسؤولون'}
          </h1>
          {pagination && (
            <p className="text-sm text-secondary/50 mt-1">
              {pagination.total} مسؤول
            </p>
          )}
        </div>
        <button
          onClick={() => { setEditAdmin(null); setView('form'); }}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          {t('addAdmin' as any) || 'إضافة مسؤول'}
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
        {/* Search + per-page controls */}
        <div className="mb-5 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className={cn('absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40', dir === 'ltr' ? 'left-3' : 'right-3')} />
            <input
              type="text"
              placeholder={t('searchAdmins' as any) || 'بحث بالاسم أو البريد...'}
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
              className={cn(
                'w-full bg-white/50 border border-secondary/10 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm',
                dir === 'ltr' ? 'pl-9 pr-4' : 'pr-9 pl-4',
              )}
            />
          </div>

          {/* Per-page */}
          <div className="relative">
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="appearance-none bg-white/50 border border-secondary/10 rounded-xl px-4 py-2.5 pe-8 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {PER_PAGE_OPTIONS.map(n => (
                <option key={n} value={n}>{n} لكل صفحة</option>
              ))}
            </select>
            <ChevronDown className="absolute top-1/2 -translate-y-1/2 end-2.5 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
          </div>
        </div>

        {/* List */}
        {listLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
            <UserSearch className="w-12 h-12 mb-4 opacity-50" />
            <p>{t('noDataFound' as any) || 'لا توجد بيانات'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3 w-full">
            <AnimatePresence mode="popLayout">
              {admins.map((admin) => (
                <motion.div
                  key={admin.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => { setViewAdminId(admin.id); setView('view'); }}
                  className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors w-full"
                >
                  {/* Avatar + info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-primary/10 border-2 border-white shadow relative">
                      {admin.image
                        ? <Image src={admin.image} alt={admin.name} fill className="object-cover" />
                        : <User className="w-full h-full p-2 text-primary/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-secondary text-base truncate">{admin.name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center text-sm text-secondary/60 gap-1 sm:gap-2 mt-0.5">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span dir="ltr">{admin.email}</span>
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                          admin.is_super_admin ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200',
                        )}>
                          <Shield className="w-3 h-3" />
                          {admin.role.display_name}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                          admin.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200',
                        )}>
                          {admin.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {admin.is_active ? (t('active' as any) || 'Active') : (t('inactive' as any) || 'Inactive')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0">
                    <button
                      title={t('view' as any)}
                      onClick={e => { e.stopPropagation(); setViewAdminId(admin.id); setView('view'); }}
                      className="p-2 sm:p-2.5 bg-white text-secondary/60 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      title={t('edit' as any)}
                      onClick={e => { e.stopPropagation(); setEditAdmin(admin.id); setView('form'); }}
                      className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {admin.can_be_deleted && (
                      <button
                        title={t('remove' as any)}
                        onClick={e => { e.stopPropagation(); setDeleteAdmin_(admin); }}
                        className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {pagination && !listLoading && (
          <div className="mt-6">
            <Pagination pagination={pagination} onPage={p => setPage(p)} />
          </div>
        )}
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {deleteAdmin_ && (
          <DeleteAdminModal
            admin={deleteAdmin_}
            onClose={() => setDeleteAdmin_(null)}
            onConfirmed={handleDeleted}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
