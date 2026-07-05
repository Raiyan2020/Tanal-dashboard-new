'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

interface RoleFormProps {
  roleId: number | null;
  onBack: () => void;
  onSaved: () => void;
}

interface FormValues {
  nameAr: string;
  nameEn: string;
  permissionIds: number[];
}

export function RoleForm({ roleId, onBack, onSaved }: RoleFormProps) {
  const { t, dir } = useLanguage();
  const token = getToken() ?? '';

  const [permGroups, setPermGroups] = useState<PermissionGroup[]>([]);
  const [permLoading, setPermLoading] = useState(true);
  const [fetchLoading, setFetchLoading] = useState(roleId !== null);
  const [saving, setSaving] = useState(false);

  const schema = React.useMemo(() => z.object({
    nameAr: z.string().min(1, { message: t('nameArRequired') }),
    nameEn: z.string().min(1, { message: t('nameEnRequired') }),
    permissionIds: z.array(z.number()).min(1, { message: t('atLeastOnePermission') }),
  }), [t]);

  // Initialize React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nameAr: '',
      nameEn: '',
      permissionIds: [],
    },
  });

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
    Promise.all([
      getRoleById(roleId, token, 'ar'),
      getRoleById(roleId, token, 'en')
    ])
      .then(([resAr, resEn]) => {
        const arData = resAr.data;
        const enData = resEn.data;
        form.reset({
          nameAr: arData?.name || '',
          nameEn: enData?.name || '',
          permissionIds: (arData?.permissions || []).map(p => p.id),
        });
      })
      .catch(err => toast.error((err as Error).message))
      .finally(() => setFetchLoading(false));
  }, [roleId, token, form]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const fields = {
        nameAr: values.nameAr,
        nameEn: values.nameEn,
        permissionIds: values.permissionIds,
      };
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name Ar */}
              <FormField
                control={form.control}
                name="nameAr"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-secondary/80">
                      {t('nameAr')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        {...field}
                        dir="rtl"
                        className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
                        placeholder="مدير"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name En */}
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-secondary/80">
                      {t('nameEn')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <input
                        type="text"
                        {...field}
                        dir="ltr"
                        className="w-full bg-white/50 border border-secondary/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all text-secondary"
                        placeholder="Manager"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Permissions */}
            <FormField
              control={form.control}
              name="permissionIds"
              render={({ field }) => {
                const selectedSet = new Set(field.value || []);
                return (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-secondary/80 flex items-center gap-1">
                      {t('permissions')} <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <PermissionPicker
                        groups={permGroups}
                        selected={selectedSet}
                        onChange={(newSet) => {
                          field.onChange(Array.from(newSet));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

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
        </Form>
      </div>
    </motion.div>
  );
}
