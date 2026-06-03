'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Eye, Edit2, Trash2, UserSearch, XCircle, CheckCircle2, ChevronLeft, ChevronRight, User, Phone, Mail, Shield, AlertTriangle, Lock, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super admin';
  status: 'active' | 'inactive';
  password?: string;
}

const initialAdmins: Admin[] = [
  { id: '1', name: 'Super Admin', email: 'super@tanal.com', role: 'super admin', status: 'active', password: 'securepassword123' },
  { id: '2', name: 'Tarik Admin', email: 'tarik@tanal.com', role: 'admin', status: 'active', password: 'password123' },
  { id: '3', name: 'Leila Admin', email: 'leila@tanal.com', role: 'admin', status: 'inactive', password: 'password456' },
];

interface AdminEditFormProps {
  admin: Admin | null;
  onBack: () => void;
  onSave: (admin: Admin) => void;
}

function AdminEditForm({ admin, onBack, onSave }: AdminEditFormProps) {
  const { t, dir } = useLanguage();
  const [name, setName] = useState(admin?.name || '');
  const [email, setEmail] = useState(admin?.email || '');
  const [password, setPassword] = useState(admin?.password || '');
  const [role, setRole] = useState<'admin' | 'super admin'>(admin?.role || 'admin');
  const [status, setStatus] = useState<'active' | 'inactive'>(admin?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: admin?.id || Math.floor(Math.random() * 10000).toString(),
      name,
      email,
      role,
      status,
      password: password || 'defaultpass'
    });
  };

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
          {dir === 'ltr' ? (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
          <span className="font-medium">{t('back' as any)}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-2xl mx-auto crystal-accent">
         <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {admin ? t('editAdmin' as any) : t('addAdmin' as any)}
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
              {t('email' as any) || 'Email Address'} <span className="text-red-500">*</span>
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
              {t('password' as any) || 'Password'} {admin ? '' : <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              required={!admin}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary text-left"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
                 {t('role' as any) || 'Role'} <span className="text-red-500">*</span>
               </label>
               <select
                 value={role}
                 onChange={e => setRole(e.target.value as 'admin' | 'super admin')}
                 disabled={admin?.role === 'super admin'}
                 className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none disabled:opacity-50"
               >
                 <option value="admin">{t('regularAdmin' as any) || 'Admin'}</option>
                 <option value="super admin">{t('superAdmin' as any) || 'Super Admin'}</option>
               </select>
             </div>
             
             <div className="space-y-2">
               <label className="text-sm font-medium text-secondary/80 ml-1 rtl:mr-1 rtl:ml-0">
                 {t('status' as any) || 'Status'} <span className="text-red-500">*</span>
               </label>
               <select
                 value={status}
                 onChange={e => setStatus(e.target.value as 'active' | 'inactive')}
                 className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary appearance-none"
               >
                 <option value="active">{t('active' as any) || 'Active'}</option>
                 <option value="inactive">{t('inactive' as any) || 'Inactive'}</option>
               </select>
             </div>
          </div>

          <div className="pt-4 flex flex-col gap-3 border-t border-secondary/10 mt-8 w-full">
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {t('saveChanges' as any) || 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

interface AdminDetailsProps {
  admin: Admin;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

function AdminDetails({ admin, onBack, onEdit, onDelete, onToggleStatus }: AdminDetailsProps) {
  const { t, dir } = useLanguage();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const copyToClipboard = (text: string, type: 'email' | 'password') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

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
          {dir === 'ltr' ? (
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          ) : (
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          )}
          <span className="font-medium">{t('back' as any)}</span>
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 sm:p-2 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
            title={t('edit' as any)}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          {admin.role !== 'super admin' && (
            <button
              onClick={onDelete}
              className="p-2 sm:p-2 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
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
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-xl overflow-hidden mb-4 relative bg-primary/10 flex flex-col items-center justify-center">
               <User className="absolute inset-0 w-full h-full text-primary opacity-20 p-4" />
            </div>
            <h2 className={cn("text-xl sm:text-2xl font-semibold text-secondary mb-1", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {admin.name}
            </h2>
            <div className="flex flex-col gap-2 mt-4 items-center">
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shrink-0",
                admin.role === 'super admin'
                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              )}>
                <Shield className="w-3.5 h-3.5" />
                {admin.role === 'super admin' ? t('superAdmin' as any) || 'Super Admin' : t('regularAdmin' as any) || 'Admin'}
              </span>
              <button 
                onClick={onToggleStatus}
                className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border shrink-0 cursor-pointer transition-colors hover:opacity-80 active:scale-95",
                admin.status === 'active' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              )}>
                {admin.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {admin.status === 'active' ? (t('active' as any) || 'Active') : (t('inactive' as any) || 'Inactive')}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm md:col-span-2 space-y-8 crystal-accent">
          <div className="flex items-center justify-between">
            <h3 className={cn("text-lg font-semibold text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {t('adminDetails' as any) || 'Admin Details'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-secondary/60 mb-1">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{t('fullName' as any) || 'Full Name'}</span>
              </div>
              <p className="text-secondary font-medium pl-6 rtl:pr-6 rtl:pl-0">{admin.name}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-secondary/60 mb-1">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('email' as any) || 'Email'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white/40 border border-white/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow group">
                <span className="font-mono text-secondary text-sm truncate" dir="ltr">{admin.email}</span>
                <button 
                  onClick={() => copyToClipboard(admin.email, 'email')}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors cursor-pointer",
                    copiedEmail ? "text-emerald-500 bg-emerald-50" : "text-secondary/40 hover:text-primary hover:bg-primary/5"
                  )}
                  title={copiedEmail ? (t('copied' as any) || 'Copied!') : (t('copy' as any) || 'Copy')}
                >
                  {copiedEmail ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-secondary/60 mb-1">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('password' as any) || 'Password'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white/40 border border-white/60 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow group">
                <span className="font-mono text-secondary text-sm truncate" dir="ltr">{admin.password}</span>
                <button 
                  onClick={() => copyToClipboard(admin.password || '', 'password')}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors cursor-pointer",
                    copiedPassword ? "text-emerald-500 bg-emerald-50" : "text-secondary/40 hover:text-primary hover:bg-primary/5"
                  )}
                  title={copiedPassword ? (t('copied' as any) || 'Copied!') : (t('copy' as any) || 'Copy')}
                >
                  {copiedPassword ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface DeleteAdminModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

function DeleteAdminModal({ onClose, onConfirm }: DeleteAdminModalProps) {
  const { t, dir } = useLanguage();

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
          <h3 className={cn("text-xl font-semibold text-secondary mb-2", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
            {t('deleteAdminTitle' as any) || 'Delete Admin'}
          </h3>
          <p className="text-secondary/70 mb-8">
            {t('deleteAdminMessage' as any) || 'Are you sure you want to delete this admin?'}
          </p>
          <div className="w-full flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white/50 hover:bg-white/80 text-secondary border border-white/60 rounded-xl py-3 font-medium transition-all shadow-sm cursor-pointer"
            >
              {t('cancel' as any) || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
            >
              {t('remove' as any) || 'Remove'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminsPage() {
  const { t, dir } = useLanguage();
  
  const [admins, setAdmins] = useState<Admin[]>(initialAdmins);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<Admin | null>(null);
  const [adminToView, setAdminToView] = useState<Admin | null>(null);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => 
      admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [admins, searchTerm]);

  const handleSaveAdmin = (newAdmin: Admin) => {
    // Check if new admin wants to be super admin, unset others just in case, but standard logic says there should be only one.
    // However for simplicity, we mock updating it and allow if they select it unless it causes multiple super admins.
    if (newAdmin.role === 'super admin') {
        const hasExistingSuperAdmin = admins.find(a => a.role === 'super admin' && a.id !== newAdmin.id);
        if (hasExistingSuperAdmin) {
            newAdmin.role = 'admin'; // Fallback
        }
    }

    if (adminToEdit) {
      setAdmins(admins.map(a => a.id === newAdmin.id ? newAdmin : a));
      if (adminToView?.id === newAdmin.id) {
          setAdminToView(newAdmin);
      }
    } else {
      setAdmins([newAdmin, ...admins]);
    }
    setIsEditing(false);
    setAdminToEdit(null);
  };

  const handleDeleteConfirm = () => {
    if (adminToDelete) {
      setAdmins(admins.filter(a => a.id !== adminToDelete));
      if (adminToView?.id === adminToDelete) {
        setAdminToView(null);
      }
      setAdminToDelete(null);
    }
  };

  if (isEditing) {
    return <AdminEditForm admin={adminToEdit} onBack={() => setIsEditing(false)} onSave={handleSaveAdmin} />;
  }

  if (adminToView) {
    return (
      <AdminDetails 
        admin={adminToView} 
        onBack={() => setAdminToView(null)} 
        onEdit={() => { setAdminToEdit(adminToView); setIsEditing(true); }} 
        onDelete={() => setAdminToDelete(adminToView.id)}
        onToggleStatus={() => {
          const updatedAdmin = { ...adminToView, status: adminToView.status === 'active' ? 'inactive' : 'active' } as Admin;
          setAdminToView(updatedAdmin);
          setAdmins(admins.map(a => a.id === updatedAdmin.id ? updatedAdmin : a));
        }}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 sm:space-y-8 pb-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className={cn("text-2xl sm:text-3xl font-semibold text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
             {t('admins' as any) || 'Admins'}
           </h1>
        </div>
        <button 
          onClick={() => { setAdminToEdit(null); setIsEditing(true); }}
          className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          {t('addAdmin' as any) || 'Add Admin'}
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
        <div className="mb-4">
          <div className="relative flex-1">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40", dir === 'ltr' ? 'left-3' : 'right-3')} />
            <input
              type="text"
              placeholder={t('searchAdmins' as any) || 'Search admins...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full bg-white/50 border border-secondary/10 rounded-xl py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all text-sm",
                dir === 'ltr' ? 'pl-9 pr-4' : 'pr-9 pl-4'
              )}
            />
          </div>
        </div>

        {filteredAdmins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
            <UserSearch className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">{t('noDataFound' as any) || 'No data found'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:gap-3 w-full">
            <AnimatePresence mode="popLayout">
              {filteredAdmins.map((admin) => (
                <motion.div 
                  key={admin.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setAdminToView(admin)}
                  className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors w-full"
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                       <h3 className="font-semibold text-secondary text-base truncate m-0">{admin.name}</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-1 sm:gap-3 mt-1 sm:mt-0">
                       <span className="flex items-center gap-1.5 truncate max-w-full">
                         <Mail className="w-4 h-4 opacity-70 shrink-0" />
                         <span dir="ltr">{admin.email}</span>
                       </span>
                       <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                       <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit shrink-0",
                        admin.role === 'super admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      )}>
                        <Shield className="w-3 h-3" />
                        {admin.role === 'super admin' ? t('superAdmin' as any) || 'Super Admin' : t('regularAdmin' as any) || 'Admin'}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border w-fit shrink-0",
                        admin.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      )}>
                        {admin.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {admin.status === 'active' ? (t('active' as any) || 'Active') : (t('inactive' as any) || 'Inactive')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0 mt-1 md:mt-0">
                    <button 
                      title={t('view' as any)} 
                      onClick={(e) => { e.stopPropagation(); setAdminToView(admin); }}
                      className="p-2 sm:p-2.5 bg-white text-secondary/60 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      title={t('edit' as any)} 
                      onClick={(e) => { e.stopPropagation(); setAdminToEdit(admin); setIsEditing(true); }}
                      className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {admin.role !== 'super admin' && (
                      <button 
                        title={t('remove' as any)} 
                        onClick={(e) => { e.stopPropagation(); setAdminToDelete(admin.id); }}
                        className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
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
        {adminToDelete && (
          <DeleteAdminModal 
            onClose={() => setAdminToDelete(null)} 
            onConfirm={handleDeleteConfirm} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
