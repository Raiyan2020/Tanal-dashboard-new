'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { 
  Info, 
  ShieldCheck, 
  FileText, 
  Phone, 
  Globe, 
  Menu,
  X,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  CalendarDays,
  MapPin,
  Users
} from 'lucide-react';

const mockEvent = {
  nameEn: 'Royal Wedding - Salem & Sara',
  nameAr: 'حفل زفاف ملكي - سالم وسارة',
  date: '2026-10-15',
  locationEn: 'Ritz-Carlton, Riyadh',
  locationAr: 'الريتز كارلتون، الرياض',
  status: 'upcoming',
  payment: {
    status: 'installments', // 'paid', 'unpaid', 'installments'
    totalAmount: 150000,
    paidAmount: 50000,
    remainingAmount: 100000,
    installmentsLeft: 2,
  },
  attendance: {
    total: 300,
    accepted: 210,
    declined: 15,
    pending: 75,
  }
};

export default function ClientPortal() {
  const { t, language, setLanguage, dir } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleLanguage = () => setLanguage(language === 'en' ? 'ar' : 'en');

  const eName = dir === 'ltr' ? mockEvent.nameEn : mockEvent.nameAr;
  const eLocation = dir === 'ltr' ? mockEvent.locationEn : mockEvent.locationAr;
  
  const paymentStatusMap = {
    paid: dir === 'ltr' ? 'Fully Paid' : 'مدفوع بالكامل',
    unpaid: dir === 'ltr' ? 'Unpaid' : 'غير مدفوع',
    installments: dir === 'ltr' ? 'Installments' : 'أقساط',
  };

  const navItems = [
    { icon: Info, labelEn: 'About Us', labelAr: 'معلومات عنا' },
    { icon: ShieldCheck, labelEn: 'Privacy Policy', labelAr: 'سياسة الخصوصية' },
    { icon: FileText, labelEn: 'Terms & Conditions', labelAr: 'الشروط والأحكام' },
    { icon: Phone, labelEn: 'Contact Us', labelAr: 'اتصل بنا' },
  ];

  const responded = mockEvent.attendance.accepted + mockEvent.attendance.declined;
  const progressPercent = Math.round((responded / mockEvent.attendance.total) * 100);

  return (
    <div className="flex h-screen luxury-gradient overflow-hidden font-sans text-secondary pb-12">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-secondary/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 z-50 w-72 flex flex-col pt-6 pb-4 transition-transform lg:relative lg:translate-x-0",
          "glass-panel border-r-0 lg:border-r border-white/60",
          dir === 'rtl' ? 'right-0 border-l border-white/60 lg:border-r-0 lg:border-l' : 'left-0 border-r border-white/60 lg:border-r',
          !sidebarOpen && "max-lg:-translate-x-full max-lg:rtl:translate-x-full"
        )}
      >
        <div className="flex items-center px-6 mb-8 mt-2 overflow-hidden justify-between w-full h-8 relative">
          <button 
            className="lg:hidden absolute top-0 p-2 text-secondary/60 hover:text-secondary rounded-xl bg-white/40 cursor-pointer"
            style={{ [dir === 'rtl' ? 'left' : 'right']: '1rem' }}
            onClick={toggleSidebar}
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <Image
              src="https://raiyansoft.com/wp-content/uploads/2026/05/logo-2.png"
              alt="Tanal Logo"
              width={30}
              height={40}
              className="shrink-0 object-contain drop-shadow-sm w-[30px] h-10"
              referrerPolicy="no-referrer"
            />
            <span className={cn("whitespace-nowrap text-xl font-medium tracking-wide text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
              {t('tanal')}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-2">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              className="flex items-center w-full gap-4 px-3 py-3 rounded-2xl transition-all duration-300 text-secondary hover:bg-white/30 group cursor-pointer"
            >
              <item.icon className="w-5 h-5 shrink-0 text-secondary/60 group-hover:text-primary" strokeWidth={1.5} />
              <span className="font-medium text-sm text-secondary/80">{dir === 'ltr' ? item.labelEn : item.labelAr}</span>
            </button>
          ))}

          <div className="h-px bg-secondary/10 my-4 mx-4"></div>

          <button
            onClick={toggleLanguage}
            className="flex items-center w-full gap-4 px-3 py-3 rounded-2xl transition-all duration-300 text-secondary hover:bg-white/30 group cursor-pointer"
          >
            <Globe className="w-5 h-5 shrink-0 text-secondary/60 group-hover:text-primary" strokeWidth={1.5} />
            <span className="font-medium text-sm text-secondary/80">{dir === 'ltr' ? 'العربية' : 'English'}</span>
          </button>
        </nav>
      </aside>

      {/* Main Content View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-multiply" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px] -z-10 pointer-events-none mix-blend-multiply" />
        
        <header className="h-20 shrink-0 px-6 flex items-center lg:hidden">
          <button 
            onClick={toggleSidebar}
            className="p-2.5 rounded-2xl text-secondary bg-white shadow-sm ring-1 ring-secondary/5 mb-2 border border-secondary/5 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-10 lg:pl-12 rtl:lg:pl-10 rtl:lg:pr-12">
          <div className="max-w-4xl mx-auto space-y-8 pb-12">
            
            {/* Event Header Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(54,45,35,0.03)] border border-secondary/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary-dark text-sm font-medium mb-4">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    {dir === 'ltr' ? 'Upcoming Event' : 'حدث قادم'}
                  </div>
                  <h1 className={cn("text-2xl sm:text-3xl lg:text-4xl text-primary-dark mb-4 tracking-tight", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                    {eName}
                  </h1>
                </div>
              </div>
              
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-secondary/5">
                <div className="flex items-center gap-3 text-secondary/80">
                  <div className="w-10 h-10 rounded-full bg-[#F3EBE1] flex items-center justify-center shrink-0">
                    <CalendarDays className="w-5 h-5 text-primary-dark" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary/50 uppercase tracking-wider font-medium">{dir === 'ltr' ? 'Date' : 'التاريخ'}</p>
                    <p className="font-medium text-[15px]">{mockEvent.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-secondary/80">
                  <div className="w-10 h-10 rounded-full bg-[#F3EBE1] flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary-dark" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary/50 uppercase tracking-wider font-medium">{dir === 'ltr' ? 'Location' : 'الموقع'}</p>
                    <p className="font-medium text-[15px]">{eLocation}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Layout for Payment and Attendance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Payment Details Card */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(54,45,35,0.03)] border border-secondary/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <h3 className={cn("text-lg font-semibold text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                      {dir === 'ltr' ? 'Payment Details' : 'تفاصيل الدفع'}
                    </h3>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                    {paymentStatusMap[mockEvent.payment.status as keyof typeof paymentStatusMap]}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-[#F8F9FA] border border-secondary/5">
                    <div className="flex items-center gap-3 text-secondary/70">
                      <Wallet className="w-4 h-4" />
                      <span className="text-sm font-medium">{dir === 'ltr' ? 'Total Amount' : 'المبلغ الإجمالي'}</span>
                    </div>
                    <span className="font-bold text-secondary">SAR {mockEvent.payment.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-green-50/50 border border-green-100/50">
                    <div className="flex items-center gap-3 text-green-700/70">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">{dir === 'ltr' ? 'Paid Amount' : 'المبلغ المدفوع'}</span>
                    </div>
                    <span className="font-bold text-green-700">SAR {mockEvent.payment.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 rounded-2xl bg-orange-50/50 border border-orange-100/50">
                    <div className="flex items-center gap-3 text-orange-700/70">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">{dir === 'ltr' ? 'Remaining Amount' : 'المبلغ المتبقي'}</span>
                    </div>
                    <span className="font-bold text-orange-700">SAR {mockEvent.payment.remainingAmount.toLocaleString()}</span>
                  </div>
                </div>

                {mockEvent.payment.status === 'installments' && (
                  <div className="mt-4 pt-4 border-t border-secondary/5 flex justify-between items-center px-2">
                    <span className="text-sm text-secondary/60">{dir === 'ltr' ? 'Installments Left' : 'الأقساط المتبقية'}</span>
                    <span className="font-medium text-lg text-primary-dark">{mockEvent.payment.installmentsLeft}</span>
                  </div>
                )}
              </div>

              {/* Attendance Analytics Card */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_4px_24px_rgba(54,45,35,0.03)] border border-secondary/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className={cn("text-lg font-semibold text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
                    {dir === 'ltr' ? 'Attendance Analytics' : 'تحليلات الحضور'}
                  </h3>
                </div>

                <div className="mb-8">
                  <div className="flex justify-between text-sm mb-2 font-medium">
                    <span className="text-secondary/70">{dir === 'ltr' ? 'Responded' : 'استجاب'}</span>
                    <span className="text-secondary">{responded} / {mockEvent.attendance.total}</span>
                  </div>
                  <div className="h-3 bg-secondary/5 rounded-full overflow-hidden w-full relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="absolute top-0 bottom-0 left-0 bg-primary rounded-full rtl:right-0 rtl:left-auto"
                    />
                  </div>
                  <div className="text-xs text-secondary/50 text-right mt-1.5">{progressPercent}%</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-green-50/50 border border-green-100/50 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mb-2" />
                    <span className="text-2xl font-bold text-green-700">{mockEvent.attendance.accepted}</span>
                    <span className="text-xs font-medium text-green-700/70 mt-1 uppercase tracking-wider">{dir === 'ltr' ? 'Accepted' : 'مقبول'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-red-50/50 border border-red-100/50 flex flex-col items-center justify-center text-center">
                    <XCircle className="w-6 h-6 text-red-600 mb-2" />
                    <span className="text-2xl font-bold text-red-700">{mockEvent.attendance.declined}</span>
                    <span className="text-xs font-medium text-red-700/70 mt-1 uppercase tracking-wider">{dir === 'ltr' ? 'Declined' : 'مرفوض'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/10 flex flex-col items-center justify-center text-center col-span-2">
                    <Clock className="w-6 h-6 text-secondary/40 mb-2" />
                    <span className="text-2xl font-bold text-secondary">{mockEvent.attendance.pending}</span>
                    <span className="text-xs font-medium text-secondary/60 mt-1 uppercase tracking-wider">{dir === 'ltr' ? 'Pending' : 'قيد الانتظار'}</span>
                  </div>
                </div>

              </div>
              
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
