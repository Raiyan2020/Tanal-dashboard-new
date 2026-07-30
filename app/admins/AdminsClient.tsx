'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Eye, Edit2, Trash2, UserSearch,
  ChevronDown, Loader2, Shield, CheckCircle2, XCircle, User, Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarImage } from '@/components/ui/avatar-image';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getAdmins, getRoles,
  type Admin, type Role, type PaginatedItems,
} from '@/lib/api';

import { AdminForm } from './components/AdminForm';
import { AdminDetails } from './components/AdminDetails';
import { DeleteAdminModal } from './components/DeleteAdminModal';
import { Pagination } from './components/Pagination';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

type View = 'list' | 'view' | 'form';

export default function AdminsClient({
  initialData,
  initialPagination,
}: {
  initialData: Admin[] | null;
  initialPagination: PaginatedItems<Admin>['pagination'] | null;
}) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  // ── list state ──
  const [admins, setAdmins] = useState<Admin[]>(initialData ?? []);
  const [pagination, setPagination] = useState<PaginatedItems<Admin>['pagination'] | null>(initialPagination);
  const [listLoading, setListLoading] = useState(!initialData);
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

  const isInitialMount = useRef(true);

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

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchAdmins();
  }, [fetchAdmins, initialData]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
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
        <div className="mb-5 flex flex-col sm:flex-row gap-3">
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
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-primary/10 border-2 border-white shadow relative">
                      <AvatarImage
                        src={admin.image}
                        alt={admin.name}
                        className="absolute inset-0 w-full h-full"
                        fallback={<User className="w-full h-full p-2 text-primary/40" />}
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-start">
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

        {pagination && !listLoading && (
          <div className="mt-6">
            <Pagination pagination={pagination} onPage={p => setPage(p)} />
          </div>
        )}
      </div>

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
