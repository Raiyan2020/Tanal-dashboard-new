'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion } from 'motion/react';
import {
  Users,
  CalendarHeart,
  HandCoins,
  QrCode,
  UsersRound,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { getDashboardData, parseAmount, type DashboardData } from '@/lib/api';
import { getToken, getPermissions } from '@/lib/auth';

type Period = 'this_year' | 'this_month' | 'last_12_months' | 'last_6months' | 'all_time';

export function DashboardContent({
  onNavigate,
  initialData,
}: {
  onNavigate?: (id: string) => void;
  onCreateEvent?: () => void;
  initialData?: DashboardData | null;
}) {
  const { t, dir } = useLanguage();
  const [period, setPeriod] = useState<Period>('this_year');
  const [data, setData] = useState<DashboardData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Finance permission check — runs client-side only
  const hasFinanceAccess = React.useMemo(() => {
    const perms = getPermissions();
    return perms.includes('finance') || perms.includes('show-finance') || perms.includes('edit-finance');
  }, []);

  const isInitialMount = useRef(true);

  const fetchDashboard = useCallback(async (selectedPeriod: Period) => {
    if (isInitialMount.current && initialData && selectedPeriod === 'this_year') {
      isInitialMount.current = false;
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error(t('unauthorized'));
      }
      const res = await getDashboardData(selectedPeriod, token);
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || t('unexpectedError'));
    } finally {
      setLoading(false);
    }
  }, [dir, initialData, t]);

  useEffect(() => {
    fetchDashboard(period);
  }, [period, fetchDashboard]);

  const stats = data ? [
    {
      title: 'totalServiceOrders',
      value: data.stats.total_service_orders.value.toLocaleString(),
      icon: Users,
      change: `${data.stats.total_service_orders.growth >= 0 ? '+' : ''}${data.stats.total_service_orders.growth}%`,
      isPositive: data.stats.total_service_orders.trend === 'up',
      onClick: () => onNavigate?.('service-orders'),
      financeOnly: true,
    },
    {
      title: 'upcomingServiceOrders',
      value: data.stats.upcoming_service_orders.value.toLocaleString(),
      icon: CalendarHeart,
      change: `${data.stats.upcoming_service_orders.growth >= 0 ? '+' : ''}${data.stats.upcoming_service_orders.growth}%`,
      isPositive: data.stats.upcoming_service_orders.trend === 'up',
      onClick: () => onNavigate?.('service-orders'),
      financeOnly: false,
    },
    {
      title: 'monthlyProfit',
      value: data.stats.monthly_revenue.formatted || `${data.stats.monthly_revenue.value.toLocaleString()} ${data.stats.monthly_revenue.currency || 'KWD'}`,
      icon: HandCoins,
      change: `${data.stats.monthly_revenue.growth >= 0 ? '+' : ''}${data.stats.monthly_revenue.growth}%`,
      isPositive: data.stats.monthly_revenue.trend === 'up',
      financeOnly: true,
    },
    {
      title: 'qrCheckInsToday',
      value: data.stats.today_scans.value.toLocaleString(),
      icon: QrCode,
      change: `${data.stats.today_scans.growth >= 0 ? '+' : ''}${data.stats.today_scans.growth}%`,
      isPositive: data.stats.today_scans.trend === 'up',
      financeOnly: false,
    },
  ].filter(s => !s.financeOnly || hasFinanceAccess) : [];

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

  const chartData = data?.revenue_chart
    ? data.revenue_chart.labels.map((label, index) => ({
      name: label,
      revenue: data.revenue_chart.series[0]?.data[index] ?? 0,
    }))
    : [];

  if (loading && !data) {
    return (
      <div className="flex h-[400px] w-full justify-center items-center">
        <div className="flex flex-col items-center gap-3 text-secondary/60">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm font-medium">{t('loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex h-[400px] w-full justify-center items-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <div>
            <h4 className="font-semibold text-secondary">{t('failedToLoadDashboard')}</h4>
            <p className="text-xs text-secondary/60 mt-1">{error}</p>
          </div>
          <button
            onClick={() => fetchDashboard(period)}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-medium transition-all shadow-md cursor-pointer"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10 relative">
      {/* Dynamic inline updater loader */}
      {loading && data && (
        <div className="absolute top-4 right-4 sm:right-10 flex items-center gap-1.5 text-xs text-secondary/40 font-medium z-20 bg-white/70 backdrop-blur-sm px-3 py-1.5 rounded-full border border-secondary/5 shadow-sm animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>{t('updating')}</span>
        </div>
      )}

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
              <p className="text-secondary/70 text-xs sm:text-sm font-medium truncate">{t(stat.title as any)}</p>
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

      {hasFinanceAccess && (
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 lg:gap-8">
          {/* Revenue Chart — finance permission required */}
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
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as Period)}
                    className={cn(
                      "bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-1.5 outline-none text-secondary cursor-pointer appearance-none text-sm font-medium transition-all",
                      dir === 'ltr' ? 'pl-3 pr-8' : 'pr-3 pl-8'
                    )}
                  >
                    <option value="this_year">{t('thisYear')}</option>
                    <option value="this_month">{t('thisMonth')}</option>
                    <option value="last_12_months">{t('last12Months')}</option>
                    <option value="last_6months">{t('last6Months')}</option>
                    <option value="all_time">{t('allTime')}</option>
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
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
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
                    formatter={(value: any) => [`${value.toLocaleString()} ${data?.revenue_chart.currency || 'KWD'}`, dir === 'rtl' ? 'الإيرادات' : 'Revenue']}
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
      )}

      {/* Upcoming Service Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="p-6 rounded-3xl glass-panel overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className={cn("text-xl font-medium", dir === 'ltr' ? 'font-serif' : 'font-arabic')}>
            {t('upcomingServiceOrders' as any)}
          </h3>
          <button
            onClick={() => onNavigate?.('service-orders')}
            className="text-sm font-medium text-primary hover:text-primary-dark bg-white/40 px-4 py-1.5 rounded-full shadow-sm ring-1 ring-white/60 cursor-pointer"
          >
            {t('viewAll')}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {data?.upcoming_service_orders && data.upcoming_service_orders.length > 0 ? (
            data.upcoming_service_orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-white/40 hover:bg-white/60 transition-colors shadow-sm border border-secondary/5 flex flex-row items-start sm:items-center gap-3 sm:gap-4 group cursor-pointer"
                onClick={() => onNavigate?.('service-orders')}
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-[14px] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform mt-0.5 sm:mt-0">
                  <CalendarHeart className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="flex flex-col justify-center min-w-0">
                    <span className="font-semibold text-secondary text-sm sm:text-base line-clamp-2 leading-tight">
                      <span className="font-mono text-xs text-secondary/50 me-1.5">{order.reference_label}</span>
                      {order.service_name}
                    </span>
                    <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-1 sm:mt-1.5 text-xs sm:text-sm text-secondary/60 font-medium">
                      <span className="whitespace-nowrap">{order.event_date}</span>
                      {order.event_time && (
                        <>
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-secondary/20 shrink-0" />
                          <span className="whitespace-nowrap">{order.event_time}</span>
                        </>
                      )}
                      {order.client_name && (
                        <>
                          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-secondary/20 shrink-0" />
                          <span className="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
                            <UsersRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {order.client_name}
                          </span>
                        </>
                      )}
                      {order.is_barcode_suspended && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold shrink-0">
                          {dir === 'ltr' ? 'Suspended' : 'موقوف'}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasFinanceAccess && (
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t border-secondary/5 sm:border-t-0 mt-1 sm:mt-0">
                      <span className="font-bold text-secondary text-sm sm:text-base leading-none">
                        {parseAmount(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KWD
                      </span>
                      <div className="flex items-center gap-1.5">
                        {order.statuses.map((st, i) => (
                          <span key={i} className={cn(
                            "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider leading-none",
                            st.value === 'paid' ? "bg-emerald-100/60 text-emerald-700" :
                              st.value === 'installments' ? "bg-blue-100/60 text-blue-700" :
                                st.value === 'cancelled' ? "bg-rose-100/60 text-rose-700" :
                                  "bg-amber-100/60 text-amber-700"
                          )}>
                            {st.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-secondary/50 text-sm">
              {t('noUpcomingServiceOrders' as any)}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
