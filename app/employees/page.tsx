'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Eye, Edit2, Trash2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';
import { EmployeeEditForm } from './EmployeeEditForm';
import { EmployeeDetails } from './EmployeeDetails';

const MOCK_EMPLOYEES = [
  { id: 1, name: 'Tarik Admin', phone: '+966 50 111 2222', username: 'tarik_admin', password: 'password123', eventsResponsible: 4, assignedEvents: ['1001', '1002', '1004'] },
  { id: 2, name: 'Laila Staff', phone: '+966 55 222 3333', username: 'laila_s', password: 'securepass456', eventsResponsible: 2, assignedEvents: ['1003', '1005'] },
  { id: 3, name: 'Ahmed', phone: '+201013644154', username: 'Ahmed', password: 'securepass456', eventsResponsible: 1, assignedEvents: ['1005'] },
];

export default function EmployeesPage() {
  const { t, dir } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [isEditing, setIsEditing] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<any>(null);
  const [employeeToView, setEmployeeToView] = useState<any>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);

  const filteredEmployees = employees.filter(employee => {
    const term = searchTerm.toLowerCase();
    return (
      employee.name.toLowerCase().includes(term) ||
      employee.phone.toLowerCase().includes(term) ||
      employee.username.toLowerCase().includes(term)
    );
  });

  const handleRemove = () => {
    if (employeeToDelete !== null) {
      setEmployees(employees.filter(e => e.id !== employeeToDelete));
      if (employeeToView && employeeToView.id === employeeToDelete) {
        setEmployeeToView(null);
      }
      setEmployeeToDelete(null);
    }
  };

  const handleSaveEmployee = (savedEmployee: any) => {
    if (employeeToEdit) {
      setEmployees(employees.map(e => e.id === savedEmployee.id ? savedEmployee : e));
      if (employeeToView?.id === savedEmployee.id) {
        setEmployeeToView(savedEmployee);
      }
    } else {
      setEmployees([savedEmployee, ...employees]);
    }
    setIsEditing(false);
    setEmployeeToEdit(null);
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
          employee={employees.find(e => e.id === employeeToView.id) || employeeToView}
          onBack={() => setEmployeeToView(null)}
          onEdit={() => { setEmployeeToEdit(employeeToView); setIsEditing(true); }}
          onDelete={() => setEmployeeToDelete(employeeToView.id)}
          onUpdate={(updatedData) => {
            setEmployees(employees.map(e => e.id === employeeToView.id ? { ...e, ...updatedData } : e));
          }}
        />
      ) : (
        <div className="space-y-6 pb-10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <h2 className={cn("text-2xl font-medium text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                {t('employees' as any)}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {employees.length}
              </span>
            </div>

            <button
              onClick={() => { setEmployeeToEdit(null); setIsEditing(true); }}
              className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {t('addEmployee' as any)}
            </button>
          </div>

          <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
            <div className="mb-4 sm:mb-6 relative w-full">
              <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-3 sm:px-4 pointer-events-none text-secondary/40">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                placeholder="Search by name, phone or username"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2 sm:py-3 pl-10 pr-4 rtl:pr-10 rtl:pl-4 transition-all outline-none text-secondary text-sm sm:text-base"
              />
            </div>

            <div className="w-full">
              {filteredEmployees.length > 0 ? (
                <div className="flex flex-col gap-2 sm:gap-3 w-full">
                  <AnimatePresence>
                    {filteredEmployees.map((employee) => (
                      <motion.div
                        key={employee.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setEmployeeToView(employee)}
                        className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors w-full"
                      >
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">#{employee.id}</span>
                            <h3 className="font-semibold text-secondary text-base truncate m-0">{employee.name}</h3>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-0.5 sm:gap-3">
                            <span className="truncate max-w-full" dir="ltr">{employee.phone}</span>
                            <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                            <span className="truncate max-w-full">{employee.username}</span>
                            <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-primary text-xs font-semibold bg-primary/10">
                              {employee.eventsResponsible} {t('eventsResponsible' as any)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0 mt-1 md:mt-0">
                          <button
                            title={t('view' as any)}
                            onClick={(e) => { e.stopPropagation(); setEmployeeToView(employee); }}
                            className="p-2 sm:p-2.5 bg-white text-secondary/60 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title={t('edit' as any)}
                            onClick={(e) => { e.stopPropagation(); setEmployeeToEdit(employee); setIsEditing(true); }}
                            className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 active:translate-y-0 rounded-xl transition-all duration-200 ease-out flex items-center justify-center cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            title={t('remove' as any)}
                            onClick={(e) => { e.stopPropagation(); setEmployeeToDelete(employee.id); }}
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
                <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
                  <Shield className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                  <p className="text-sm sm:text-base">No employees found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
