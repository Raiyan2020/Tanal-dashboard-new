'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import { Users, CalendarHeart, HandPlatter, HandCoins, QrCode, MailCheck, UsersRound, Send, Plus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const revenueData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 5000 },
  { name: 'Apr', revenue: 4500 },
  { name: 'May', revenue: 6000 },
  { name: 'Jun', revenue: 8000 },
  { name: 'Jul', revenue: 7500 },
];

export function DashboardContent({ onNavigate, onCreateEvent }: { onNavigate?: (id: string) => void, onCreateEvent?: () => void }) {
  const { t, dir } = useLanguage();
  const [revenueFilter, setRevenueFilter] = useState('all');

  const stats = [
    { title: 'totalClients', value: '1,248', icon: Users, change: '+12%', isPositive: true, onClick: () => onNavigate?.('clients') },
    { title: 'upcomingEvents', value: '34', icon: CalendarHeart, change: '+5%', isPositive: true, onClick: () => onNavigate?.('events') },
    { title: 'monthlyProfit', value: '84.5k KWD', icon: HandCoins, change: '+18%', isPositive: true },
    { title: 'qrCheckInsToday', value: '892', icon: QrCode, change: '-2%', isPositive: false },
  ];

  const statCardsVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: "easeOut"
      },
    }),
  };

  return (
    <div className="space-y-8 pb-10">
       {/* Greeting Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <motion.h2 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className={cn("text-3xl lg:text-4xl text-primary-dark", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}
           >
             {t('welcomeBack')}
           </motion.h2>
           <motion.p 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.2 }}
             className="text-secondary/60 mt-1"
           >
             {t('luxuryExperience')}
           </motion.p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={statCardsVariants}
            onClick={stat.onClick}
            className="p-4 sm:p-6 rounded-3xl glass-panel relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 h-[130px] sm:h-[160px] flex flex-col justify-between cursor-pointer"
          >
            <div className="absolute top-0 right-0 p-4 -mr-4 -mt-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <stat.icon className="w-24 h-24 text-primary" />
            </div>
            <div className="relative z-10 w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl bg-white/50 flex items-center justify-center shadow-sm">
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div className="relative z-10 w-full min-w-0">
              <p className="text-secondary/70 text-xs sm:text-sm font-medium truncate">{t(stat.title as keyof typeof t)}</p>
              <div className="flex items-center sm:items-baseline gap-1.5 sm:gap-2 mt-0.5 sm:mt-1 flex-nowrap overflow-hidden">
                <h3 className={cn("font-semibold text-secondary leading-none truncate min-w-0 flex-shrink", stat.value.length > 7 ? "text-base sm:text-lg" : "text-xl sm:text-3xl")}>{stat.value}</h3>
                <span className={cn("text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full shrink-0", stat.isPositive ? "bg-emerald-100/50 text-emerald-700" : "bg-red-100/50 text-red-700")}>
                  {stat.change}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 lg:gap-8">
        
        {/* Charts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="p-6 rounded-3xl glass-panel flex flex-col"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className={cn("text-xl font-medium", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>{t('revenue')}</h3>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="relative">
                <select
                  value={revenueFilter}
                  onChange={(e) => setRevenueFilter(e.target.value)}
                  className={cn(
                    "bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-1.5 outline-none text-secondary cursor-pointer appearance-none text-sm font-medium transition-all",
                    dir === 'ltr' ? 'pl-3 pr-8' : 'pr-3 pl-8'
                  )}
                >
                  <option value="all">{dir === 'ltr' ? 'All Time' : 'كل الوقت'}</option>
                  <option value="today">{dir === 'ltr' ? 'Today' : 'اليوم'}</option>
                  <option value="lastWeek">{dir === 'ltr' ? 'Last Week' : 'الأسبوع الماضي'}</option>
                  <option value="lastMonth">{dir === 'ltr' ? 'Last Month' : 'الشهر الماضي'}</option>
                  <option value="lastYear">{dir === 'ltr' ? 'Last Year' : 'السنة الماضية'}</option>
                </select>
                <div className={cn("absolute inset-y-0 flex items-center pointer-events-none text-secondary/50", dir === 'ltr' ? 'right-2' : 'left-2')}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              <button onClick={() => onNavigate?.('financial')} className="text-sm font-medium text-primary hover:text-primary-dark bg-white/40 px-4 py-1.5 rounded-full shadow-sm ring-1 ring-white/60 cursor-pointer whitespace-nowrap">
                {t('viewAll')}
              </button>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-secondary)', opacity: 0.5, fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'var(--color-secondary)', opacity: 0.5, fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255,255,255,0.8)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    color: 'var(--color-secondary)'
                  }}
                  itemStyle={{ color: 'var(--color-primary)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="var(--color-primary)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  activeDot={{ r: 6, fill: "var(--color-primary)", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      
      {/* Upcoming Events Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="p-6 rounded-3xl glass-panel overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className={cn("text-xl font-medium", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>{t('upcomingEvents' as any)}</h3>
          <button 
            onClick={() => onNavigate?.('events')}
            className="text-sm font-medium text-primary hover:text-primary-dark bg-white/40 px-4 py-1.5 rounded-full shadow-sm ring-1 ring-white/60 cursor-pointer"
          >
            {t('viewAll')}
          </button>
        </div>
        
        <div className="flex flex-col gap-3">
          {[
             { name: 'Al Saud Royal Wedding', date: 'Oct 24, 2026', guests: '850', amount: '150k KWD', status: 'pending' },
             { name: 'Al Rajhi Ceremony', date: 'Nov 12, 2026', guests: '420', amount: '85k KWD', status: 'approved' },
             { name: 'Al Olayan Reception', date: 'Dec 05, 2026', guests: '1.2k', amount: '210k KWD', status: 'approved' },
          ].map((row, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/40 hover:bg-white/60 transition-colors shadow-sm border border-secondary/5 flex flex-row items-start sm:items-center gap-3 sm:gap-4 group cursor-pointer">
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-[14px] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mt-0.5 sm:mt-0">
                <CalendarHeart className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="flex flex-col justify-center min-w-0">
                  <span className="font-semibold text-secondary text-sm sm:text-base line-clamp-2 leading-tight">{row.name}</span>
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-1 sm:mt-1.5 text-xs sm:text-sm text-secondary/60 font-medium">
                    <span className="whitespace-nowrap">{row.date}</span>
                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-secondary/20 shrink-0"></span>
                    <span className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                      <UsersRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                      {row.guests}
                    </span>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t border-secondary/5 sm:border-t-0 mt-1 sm:mt-0">
                  <span className="font-bold text-secondary text-sm sm:text-base leading-none">{row.amount}</span>
                  <span className={cn(
                    "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider leading-none",
                    row.status === 'approved' ? "bg-emerald-100/60 text-emerald-700" : "bg-amber-100/60 text-amber-700"
                  )}>
                    {t(row.status as keyof typeof t)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

    </div>
  );
}
