import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface EmployeeEditFormProps {
  employee?: any;
  onBack: () => void;
  onSave: (employee: any) => void;
}

export function EmployeeEditForm({ employee, onBack, onSave }: EmployeeEditFormProps) {
  const { t, dir } = useLanguage();
  const [name, setName] = useState(employee?.name || '');
  const [phoneExt, setPhoneExt] = useState('SA +966');
  const [phoneStr, setPhoneStr] = useState(employee?.phone.replace(/^\+966\s*/, '') || '');
  const [username, setUsername] = useState(employee?.username || '');
  const [password, setPassword] = useState(employee?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: employee?.id || Math.floor(Math.random() * 10000),
      name,
      phone: `+966 ${phoneStr}`,
      username,
      password,
      eventsResponsible: employee?.eventsResponsible || 0,
      assignedEvents: employee?.assignedEvents || []
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
          <span className="font-medium">{t('back' as any) || 'Back'}</span>
        </button>
      </div>

      <div className="glass-panel p-6 sm:p-8 rounded-[2rem] border border-secondary/5 shadow-sm w-full max-w-3xl mx-auto crystal-accent">
        <h2 className={cn("text-2xl font-medium text-secondary mb-8", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
          {employee ? (t('editEmployee' as any) || 'Edit Employee') : (t('addEmployee' as any) || 'Add Employee')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
              {t('fullName' as any) || 'Full Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
              {t('phoneNumber' as any) || 'Phone Number'} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative shrink-0 w-[120px]">
                <select
                  value={phoneExt}
                  onChange={e => setPhoneExt(e.target.value)}
                  className="w-full appearance-none bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 pl-4 pr-10 transition-all outline-none text-secondary text-sm font-medium h-full cursor-pointer"
                >
                  <option>SA +966</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-secondary/50">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </div>
              </div>
              <input
                type="tel"
                value={phoneStr}
                onChange={(e) => setPhoneStr(e.target.value)}
                required
                dir="ltr"
                className="flex-1 min-w-0 bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
              {t('username' as any) || 'Username'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 transition-all outline-none text-secondary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary/80 ml-1 flex items-center gap-2">
              {t('password' as any) || 'Password'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/50 border border-secondary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-3 px-4 pr-12 transition-all outline-none text-secondary tracking-widest font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-secondary/40 hover:text-secondary/60 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3 border-t border-secondary/10 mt-8 w-full">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:flex-1 px-5 py-3.5 rounded-xl border border-secondary/20 bg-white/50 text-secondary hover:bg-white/80 font-medium transition-colors cursor-pointer"
            >
              {t('cancel' as any) || 'Cancel'}
            </button>
            <button
              type="submit"
              className="w-full sm:flex-1 bg-primary hover:bg-primary-dark text-white py-3.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              {t('save' as any) || 'Save'}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
