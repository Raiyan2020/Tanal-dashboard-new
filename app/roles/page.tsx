'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Edit2, Trash2, ShieldCheck, AlertTriangle,
  Loader2, ChevronLeft, ChevronRight, Users, Lock,
  CheckSquare, Square, ChevronDown, ChevronUp, Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getRoles, getRoleById, createRole, updateRole, deleteRole, getPermissions,
  type Role, type RoleDetail, type PermissionGroup,
} from '@/lib/api';

/* ─── helpers ──────────────────────────────────────────────────── */
function actionColor(action: string) {
  switch (action) {
    case 'view':   return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'add':    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'edit':   return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'delete': return 'bg-red-50 text-red-700 border-red-200';
    case 'show':   return 'bg-violet-50 text-violet-700 border-violet-200';
    case 'block':  return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'cancel': return 'bg-pink-50 text-pink-700 border-pink-200';
    default:       return 'bg-secondary/5 text-secondary border-secondary/20';
  }
}

/* ─── Permission Picker ────────────────────────────────────────── */
interface PermPickerProps {
  groups: PermissionGroup[];
  selected: Set<number>;
  onChange: (s: Set<number>) => void;
}

function PermissionPicker({ groups, selected, onChange }: PermPickerProps) {
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
      {/* search + bulk */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-secondary/40" />
          <input
            type="text"
            placeholder="بحث في الصلاحيات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/50 border border-secondary/20 rounded-xl ps-9 pe-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
        <button type="button" onClick={selectAll} className="text-xs px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer font-medium">
          تحديد الكل
        </button>
        <button type="button" onClick={clearAll} className="text-xs px-3 py-2 rounded-xl bg-secondary/8 text-secondary/70 hover:bg-secondary/15 transition-colors cursor-pointer font-medium">
          مسح الكل
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
              {/* group header */}
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

              {/* permissions grid */}
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

      <p className="text-xs text-secondary/40 text-end">{selected.size} صلاحية محددة</p>
    </div>
  );
}

/* ─── Role Form (create / edit) ────────────────────────────────── */
interface RoleFormProps {
  roleId: number | null;
  onBack: () => void;
  onSaved: () => void;
}

function RoleForm({ roleId, onBack, onSaved }: RoleFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [permLoading, setPermLoading] = useState(true);
  const [fetchLoading, setFetchLoading] = useState(roleId !== null);
  const [saving, setSaving] = useState(false);

  // load permissions
  useEffect(() => {
    setPermLoading(true);
    getPermissions(token)
      .then(res => setPermGroups(res.data.items))
      .catch(err => toast.error((err as Error).message))
      .finally(() => setPermLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load role data in edit mode
  useEffect(() => {
    if (roleId === null) return;
    setFetchLoading(true);
    getRoleById(roleId, token)
      .then(res => {
        const r = res.data;
        setNameAr(r.name);    // API returns the active locale name; server stores both
        setNameEn(r.name);    // pre-fill both; user can correct if needed
        setSelected(new Set(r.permissions.map(p => p.id)));
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setFetchLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameAr.trim()) { toast.error('الاسم بالعربية مطلوب'); return; }
    if (!nameEn.trim()) { toast.error('الاسم بالإنجليزية مطلوب'); return; }
    if (selected.size === 0) { toast.error('يرجى اختيار صلاحية واحدة على الأقل'); return; }
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
      className="space-y-6 pb-10 w-full"
    >
      {/* back */}
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
          {roleId !== null ? 'تعديل الدور' : 'إضافة دور جديد'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-secondary/80">الاسم بالعربية <span className="text-red-500">*</span></label>
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
              <label className="text-sm font-medium text-secondary/80">الاسم بالإنجليزية <span className="text-red-500">*</span></label>
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
            <label className="text-sm font-medium text-secondary/80">الصلاحيات <span className="text-red-500">*</span></label>
            <PermissionPicker groups={permGroups} selected={selected} onChange={setSelected} />
          </div>

          <div className="pt-4 border-t border-secondary/10">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (t('saveChanges' as any) || 'حفظ')}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

/* ─── Delete Role Modal ────────────────────────────────────────── */
function DeleteRoleModal({ role, onClose, onConfirmed }: { role: Role; onClose: () => void; onConfirmed: () => void }) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      const res = await deleteRole(role.id, token);
      toast.success((res as any).msg ?? 'تم الحذف');
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
        className="w-full max-w-sm glass-panel crystal-accent rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 sm:p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6 text-red-500">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className={cn('text-xl font-semibold text-secondary mb-2', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>حذف الدور</h3>
          <p className="text-secondary/70 mb-2">هل أنت متأكد من حذف هذا الدور؟</p>
          <p className="font-semibold text-secondary mb-8">{role.name}</p>
          <div className="w-full flex gap-3">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 bg-white/50 hover:bg-white/80 text-secondary border border-white/60 rounded-xl py-3 font-medium transition-all cursor-pointer">
              {t('cancel' as any) || 'إلغاء'}
            </button>
            <button type="button" onClick={confirm} disabled={loading}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('remove' as any) || 'حذف'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Role Detail View ─────────────────────────────────────────── */
interface RoleDetailViewProps {
  roleId: number;
  onBack: () => void;
  onEdit: () => void;
  onDelete: (role: Role) => void;
}

function RoleDetailView({ roleId, onBack, onEdit, onDelete }: RoleDetailViewProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRoleById(roleId, token)
      .then(res => setRole(res.data))
      .catch(err => toast.error((err as Error).message))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  if (loading) return <div className="flex justify-center py-32"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!role) return null;

  // group permissions by module
  const grouped = role.permissions.reduce<Record<string, { label: string; perms: typeof role.permissions }>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = { label: p.module, perms: [] };
    acc[p.module].perms.push(p);
    return acc;
  }, {});

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'ltr' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'ltr' ? -20 : 20 }}
      className="space-y-6 pb-10 w-full"
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

      {/* summary card */}
      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm crystal-accent">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className={cn('text-2xl font-bold text-secondary', dir === 'rtl' ? 'font-arabic' : 'font-serif')}>{role.name}</h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 text-sm text-secondary/60 bg-secondary/8 px-3 py-1 rounded-full">
                <Users className="w-4 h-4" /> {role.admins_count} مسؤول
              </span>
              <span className="inline-flex items-center gap-1.5 text-sm text-secondary/60 bg-secondary/8 px-3 py-1 rounded-full">
                <Lock className="w-4 h-4" /> {role.permissions_count} صلاحية
              </span>
              {role.is_super_admin && (
                <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">مشرف رئيسي</span>
              )}
              {role.is_protected && (
                <span className="text-xs px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">محمي</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* permissions by module */}
      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm crystal-accent">
        <h3 className={cn('text-lg font-semibold text-secondary mb-6', dir === 'rtl' ? 'font-arabic' : 'font-serif')}>الصلاحيات الممنوحة</h3>
        <div className="space-y-5">
          {Object.entries(grouped).map(([mod, { label, perms }]) => (
            <div key={mod}>
              <p className="text-xs font-semibold text-secondary/40 uppercase tracking-widest mb-2">{label}</p>
              <div className="flex flex-wrap gap-2">
                {perms.map(p => (
                  <span key={p.id} className={cn('inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium', actionColor(p.action))}>
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */
type View = 'list' | 'form' | 'detail';

export default function RolesPage() {
  const { t, dir } = useLanguage();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    setToken(getToken() ?? '');
  }, []);

  const [roles, setRoles] = useState<Role[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const [view, setView] = useState<View>('list');
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [viewRoleId, setViewRoleId] = useState<number | null>(null);
  const [deleteRole_, setDeleteRole_] = useState<Role | null>(null);

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

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

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
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={cn('text-2xl sm:text-3xl font-semibold text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('roles' as any) || 'الأدوار والصلاحيات'}
          </h1>
          <p className="text-sm text-secondary/50 mt-1">{roles.length} دور</p>
        </div>
        <button
          onClick={() => { setEditRoleId(null); setView('form'); }}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          إضافة دور
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
                  {/* info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-secondary truncate">{role.name}</h3>
                        {role.is_super_admin && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full">مشرف رئيسي</span>
                        )}
                        {role.is_protected && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">محمي</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-secondary/50 flex-wrap">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{role.admins_count} مسؤول</span>
                        <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" />{role.permissions_count} صلاحية</span>
                      </div>
                    </div>
                  </div>

                  {/* actions */}
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

      {/* delete modal */}
      <AnimatePresence>
        {deleteRole_ && (
          <DeleteRoleModal role={deleteRole_} onClose={() => setDeleteRole_(null)} onConfirmed={handleDeleted} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
