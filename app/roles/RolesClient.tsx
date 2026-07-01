'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ShieldCheck, Edit2, Trash2, Users, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import { getRoles, type Role } from '@/lib/api';

import { RoleForm } from './components/RoleForm';
import { RoleDetailView } from './components/RoleDetailView';
import { DeleteRoleModal } from './components/DeleteRoleModal';

/* ─── Main Page ────────────────────────────────────────────────── */
type ViewType = 'list' | 'form' | 'detail';

export default function RolesClient({
  initialData,
}: {
  initialData: Role[] | null;
}) {
  const { t, dir } = useLanguage();
  const [token] = useState(() => getToken() ?? '');

  const [roles, setRoles] = useState<Role[]>(initialData ?? []);
  const [listLoading, setListLoading] = useState(!initialData);

  const [view, setView] = useState<ViewType>('list');
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [viewRoleId, setViewRoleId] = useState<number | null>(null);
  const [deleteRole_, setDeleteRole_] = useState<Role | null>(null);

  const isInitialMount = useRef(true);

  const fetchRoles = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const res = await getRoles(token);
      setRoles(res.data.items);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setListLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchRoles();
  }, [fetchRoles, initialData]);

  const handleSaved = () => { setView('list'); setEditRoleId(null); fetchRoles(); };
  const handleDeleted = () => { setDeleteRole_(null); if (view === 'detail') setView('list'); fetchRoles(); };

  /* ── FORM view ── */
  if (view === 'form') {
    return (
      <AnimatePresence mode="wait">
        <RoleForm
          key={`form-${editRoleId ?? 'new'}`}
          roleId={editRoleId}
          onBack={() => { setView('list'); setEditRoleId(null); }}
          onSaved={handleSaved}
        />
      </AnimatePresence>
    );
  }

  /* ── DETAIL view ── */
  if (view === 'detail' && viewRoleId !== null) {
    return (
      <>
        <AnimatePresence mode="wait">
          <RoleDetailView
            key={`detail-${viewRoleId}`}
            roleId={viewRoleId}
            onBack={() => { setView('list'); setViewRoleId(null); }}
            onEdit={() => { setEditRoleId(viewRoleId); setView('form'); }}
            onDelete={r => setDeleteRole_(r)}
          />
        </AnimatePresence>
        <AnimatePresence>
          {deleteRole_ && (
            <DeleteRoleModal role={deleteRole_} onClose={() => setDeleteRole_(null)} onConfirmed={handleDeleted} />
          )}
        </AnimatePresence>
      </>
    );
  }

  /* ── LIST view ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 pb-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('roles')}
          </h1>
          <p className="text-sm text-secondary/50 mt-1">{roles.length} {t('roleCount')}</p>
        </div>
        <button
          onClick={() => { setEditRoleId(null); setView('form'); }}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          {t('addRole')}
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
        {listLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
            <ShieldCheck className="w-12 h-12 mb-4 opacity-50" />
            <p>{t('noDataFound' as any) || 'لا توجد أدوار'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {roles.map(role => (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => { setViewRoleId(role.id); setView('detail'); }}
                  className="p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 text-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-secondary truncate">{dir === 'rtl' ? role.name_ar : role.name_en}</h3>
                        {role.is_super_admin && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">{t('superAdmin')}</span>
                        )}
                        {role.is_protected && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">{t('protected')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-secondary/50 flex-wrap">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{role.admins_count} {t('adminCount')}</span>
                        <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" />{role.permissions_count} {t('permissionCount')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 justify-end border-t border-secondary/5 sm:border-none pt-2 sm:pt-0">
                    {role.can_be_edited && (
                      <button
                        title={t('edit' as any)}
                        onClick={e => { e.stopPropagation(); setEditRoleId(role.id); setView('form'); }}
                        className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {role.can_be_deleted && (
                      <button
                        title={t('remove' as any)}
                        onClick={e => { e.stopPropagation(); setDeleteRole_(role); }}
                        className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all cursor-pointer"
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
      </div>

      <AnimatePresence>
        {deleteRole_ && (
          <DeleteRoleModal role={deleteRole_} onClose={() => setDeleteRole_(null)} onConfirmed={handleDeleted} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
