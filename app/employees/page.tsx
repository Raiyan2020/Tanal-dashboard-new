'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Eye, Edit2, Trash2, Shield, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';
import { EmployeeEditForm } from './EmployeeEditForm';
import { EmployeeDetails } from './EmployeeDetails';
import { getEmployees, deleteEmployee, createEmployee, updateEmployee, getEmployeeById } from '@/lib/api';
import type { ApiEmployee } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

export default function EmployeesPage() {
  const { t, dir, language } = useLanguage();
  const token = getToken() ?? '';

  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<any>(null);
  const [employeeToView, setEmployeeToView] = useState<any>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);

  // Search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchEmployees = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getEmployees(
        { page, per_page: 15, keyword: debouncedSearch },
        token
      );
      setEmployees(res.data.items);
      setTotalPages(res.data.pagination.last_page);
      setTotalItems(res.data.pagination.total);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل الموظفين');
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedSearch]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleRemove = async () => {
    if (employeeToDelete !== null && token) {
      const delToast = toast.loading('Deleting employee...');
      try {
        await deleteEmployee(employeeToDelete, token);
        toast.success(t('deleteEmployeeSuccess' as any) || 'Employee deleted successfully');
        if (employeeToView && employeeToView.id === employeeToDelete) {
          setEmployeeToView(null);
        }
        setEmployeeToDelete(null);
        fetchEmployees();
      } catch (err) {
        toast.error((err as Error).message || 'فشل حذف الموظف');
      } finally {
        toast.dismiss(delToast);
      }
    }
  };

  const handleSaveEmployee = async (payload: any) => {
    if (!token) return;
    const saveToast = toast.loading(employeeToEdit ? 'Updating employee...' : 'Creating employee...');
    try {
      if (employeeToEdit) {
        await updateEmployee(employeeToEdit.id, payload, token);
        toast.success(t('updateEmployeeSuccess' as any) || 'Employee updated successfully');
        if (employeeToView?.id === employeeToEdit.id) {
          const detailRes = await getEmployeeById(employeeToEdit.id, token);
          setEmployeeToView(detailRes.data);
        }
      } else {
        await createEmployee(payload, token);
        toast.success(t('createEmployeeSuccess' as any) || 'Employee created successfully');
      }
      setIsEditing(false);
      setEmployeeToEdit(null);
      fetchEmployees();
    } catch (err) {
      toast.error((err as Error).message || 'فشل حفظ بيانات الموظف');
    } finally {
      toast.dismiss(saveToast);
    }
  };

  return (
    <>
      <AnimatePresence>
        {employeeToDelete !== null && (
          <ConfirmModal
            isOpen={employeeToDelete !== null}
            onClose={() => setEmployeeToDelete(null)}
            onConfirm={handleRemove}
            title={t('confirmDeleteEmployee' as any) || 'Delete Employee'}
            message={t('confirmDeleteEmployeeMessage' as any) || 'Are you sure you want to delete this employee?'}
          />
        )}
      </AnimatePresence>

      {isEditing ? (
        <EmployeeEditForm
          employee={employeeToEdit}
          onBack={() => {
            setIsEditing(false);
            setEmployeeToEdit(null);
          }}
          onSave={handleSaveEmployee}
        />
      ) : employeeToView ? (
        <EmployeeDetails
          employee={employeeToView}
          onBack={() => setEmployeeToView(null)}
          onEdit={() => { setEmployeeToEdit(employeeToView); setIsEditing(true); }}
          onDelete={() => setEmployeeToDelete(employeeToView.id)}
          onUpdate={fetchEmployees}
        />
      ) : (
        <div className="space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className={cn("text-2xl font-medium text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {t('employees' as any) || (language === 'ar' ? 'الموظفون' : 'Employees')}
              </h2>
              {!loading && (
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold animate-fade-in">
                  {totalItems}
                </span>
              )}
            </div>

            <button
              onClick={() => { setEmployeeToEdit(null); setIsEditing(true); }}
              className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('addEmployee' as any) || (language === 'ar' ? 'إضافة موظف' : 'Add Employee')}
            </button>
          </div>

          <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden min-h-[300px] relative">
            <div className="mb-4 sm:mb-6 relative w-full">
              <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-3 sm:px-4 pointer-events-none text-secondary/40">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                placeholder={language === 'ar' ? 'ابحث بالاسم، الهاتف أو اسم المستخدم' : 'Search by name, phone or username'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2 sm:py-3 pl-10 pr-4 rtl:pr-10 rtl:pl-4 transition-all outline-none text-secondary text-sm sm:text-base"
              />
            </div>

            {loading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            <div className="w-full">
              {employees.length > 0 ? (
                <div className="flex flex-col gap-2 sm:gap-3 w-full">
                  <AnimatePresence>
                    {employees.map((employee) => (
                      <motion.div
                        key={employee.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setEmployeeToView(employee)}
                        className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors w-full"
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-start">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">{employee.reference_label}</span>
                            <h3 className="font-semibold text-secondary text-base truncate m-0">{employee.name}</h3>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-0.5 sm:gap-3">
                            <span className="truncate max-w-full" dir="ltr">{employee.full_phone}</span>
                            <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                            <span className="truncate max-w-full">@{employee.username}</span>
                            <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-primary text-xs font-semibold bg-primary/10 w-fit">
                              {employee.assigned_events_count} {language === 'ar' ? 'مناسبات معينة' : 'events assigned'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0 mt-1 md:mt-0" onClick={e => e.stopPropagation()}>
                          <button
                            title={t('view' as any) || 'View'}
                            onClick={() => setEmployeeToView(employee)}
                            className="p-2 sm:p-2.5 bg-white text-secondary/60 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title={t('edit' as any) || 'Edit'}
                            onClick={() => { setEmployeeToEdit(employee); setIsEditing(true); }}
                            className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title={t('remove' as any) || 'Remove'}
                            onClick={() => setEmployeeToDelete(employee.id)}
                            className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                !loading && (
                  <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
                    <Shield className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">{language === 'ar' ? 'لم يتم العثور على موظفين.' : 'No employees found.'}</p>
                  </div>
                )
              )}
            </div>

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 mt-4 border-t border-secondary/5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {dir === 'ltr' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <span className="text-xs text-secondary/60 font-mono px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-xl bg-white border border-secondary/10 text-secondary/60 hover:text-secondary hover:border-secondary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  {dir === 'ltr' ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
