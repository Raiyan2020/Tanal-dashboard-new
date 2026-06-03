'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Download, Filter, ArrowDownWideNarrow, ArrowUpNarrowWide, Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOCK_FINANCIALS = [
  { id: 'FIN-1001', eventName: 'Al Saud Royal Wedding', clientName: 'Abdulrahman Al Saud', clientPhone: '+966 50 123 4567', date: '2026-10-24', amount: 15400 },
  { id: 'FIN-1002', eventName: 'Al Rajhi Ceremony', clientName: 'Mohammed Al Rajhi', clientPhone: '+966 55 987 6543', date: '2026-11-12', amount: 9800 },
  { id: 'FIN-1003', eventName: 'Al Olayan Reception', clientName: 'Sara Al Olayan', clientPhone: '+966 53 456 7890', date: '2026-12-05', amount: 12500 },
  { id: 'FIN-1004', eventName: 'Al Jasser Wedding', clientName: 'Fahad Al Jasser', clientPhone: '+966 56 111 2222', date: '2027-01-15', amount: 7200 },
  { id: 'FIN-1005', eventName: 'Ahmed & Sara Wedding', clientName: 'Ahmed Abdullah', clientPhone: '+966 52 333 4444', date: '2027-02-20', amount: 5500 },
];

export default function FinancialPage() {
  const { t, dir } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  const [dateFilter, setDateFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  const uniqueEvents = useMemo(() => Array.from(new Set(MOCK_FINANCIALS.map(f => f.eventName))), []);
  const uniqueClients = useMemo(() => Array.from(new Set(MOCK_FINANCIALS.map(f => f.clientName))), []);

  const handleDownloadPdf = () => {
    // Mock functionality
    console.log('Downloading PDF...');
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const filteredAndSortedFinancials = useMemo(() => {
    let result = [...MOCK_FINANCIALS];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.eventName.toLowerCase().includes(term) ||
        item.clientName.toLowerCase().includes(term) ||
        item.clientPhone.includes(term) ||
        item.id.toLowerCase().includes(term)
      );
    }

    if (dateFilter) {
      result = result.filter(item => item.date === dateFilter);
    }
    
    if (eventFilter) {
      result = result.filter(item => item.eventName === eventFilter);
    }
    
    if (clientFilter) {
      result = result.filter(item => item.clientName === clientFilter);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [searchTerm, dateFilter, eventFilter, clientFilter, sortOrder]);

  return (
    <div className="space-y-6 pb-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className={cn("text-2xl font-medium text-secondary", dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {t('financial' as any) || 'Financial'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {filteredAndSortedFinancials.length}
            </span>
          </div>
        </div>

      <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative w-full md:w-96 flex-shrink-0">
              <div className="absolute inset-y-0 left-0 rtl:right-0 rtl:left-auto flex items-center px-3 sm:px-4 pointer-events-none text-secondary/40">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                placeholder={t('searchFinancial' as any) || 'Search by event, client or phone...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/50 border border-white/60 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl py-2 sm:py-3 pl-10 pr-4 rtl:pr-10 rtl:pl-4 transition-all outline-none text-secondary text-sm sm:text-base"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 px-4 py-2 sm:py-3 bg-white/40 hover:bg-white/60 border border-secondary/10 rounded-xl text-sm font-medium text-secondary ring-1 ring-secondary/5 transition-colors cursor-pointer"
                title={t('downloadPdf' as any) || 'Download PDF'}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{t('downloadPdf' as any) || 'Download PDF'}</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 sm:py-3 bg-white/40 hover:bg-white/60 border rounded-xl text-sm font-medium transition-colors ring-1 ring-secondary/5 cursor-pointer",
                  showFilters ? "border-primary text-primary" : "border-secondary/10 text-secondary"
                )}
              >
                <Filter className="w-4 h-4" />
                {t('filters' as any) || 'Filters'}
              </button>
              <button
                onClick={toggleSort}
                className="flex items-center justify-center p-2 sm:p-3 bg-white/40 hover:bg-white/60 border border-secondary/10 rounded-2xl text-secondary ring-1 ring-secondary/5 transition-colors aspect-square cursor-pointer"
                title={sortOrder === 'desc' ? (t('sortDescending' as any) || 'Sort Descending') : (t('sortAscending' as any) || 'Sort Ascending')}
              >
                {sortOrder === 'desc' ? <ArrowDownWideNarrow className="w-5 h-5" /> : <ArrowUpNarrowWide className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white/40 border border-secondary/10 rounded-2xl flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-secondary/70 mb-1">{t('filterByDate' as any) || 'Filter by Date'}</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-secondary/70 mb-1">{t('eventName' as any) || 'Event Name'}</label>
                  <select
                    value={eventFilter}
                    onChange={(e) => setEventFilter(e.target.value)}
                    className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40"
                    dir={dir}
                  >
                    <option value="">{t('allEvents' as any) || 'All Events'}</option>
                    {uniqueEvents.map(event => (
                      <option key={event} value={event}>{event}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-secondary/70 mb-1">{t('client' as any) || 'Client'}</label>
                  <select
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="w-full bg-white/60 border border-secondary/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/40"
                    dir={dir}
                  >
                    <option value="">{t('allClients' as any) || 'All Clients'}</option>
                    {uniqueClients.map(client => (
                      <option key={client} value={client}>{client}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setDateFilter('');
                      setEventFilter('');
                      setClientFilter('');
                    }}
                    className="px-4 py-2 text-xs font-medium text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                  >
                    {t('clear' as any) || 'Clear'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 sm:gap-3 w-full">
        <AnimatePresence>
          {filteredAndSortedFinancials.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-default hover:bg-white/60 transition-colors w-full"
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">#{item.id}</span>
                  <h3 className="font-semibold text-secondary text-base truncate m-0">{item.eventName}</h3>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-0.5 sm:gap-3">
                  <span className="truncate max-w-full font-medium" dir="ltr">{item.clientName}</span>
                  <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                  <span className="truncate max-w-full" dir="ltr">{item.clientPhone}</span>
                  <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
                  <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{item.date}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0 mt-1 md:mt-0">
                <div className="flex flex-col items-end min-w-[120px] px-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-secondary/40 whitespace-nowrap">{t('amountKWD' as any) || 'Amount KWD'}</span>
                  <span className="text-xl font-bold text-primary">
                    {item.amount.toLocaleString()} <span className="text-sm font-medium opacity-80">KWD</span>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredAndSortedFinancials.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
            <CreditCard className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
            <p className="text-sm sm:text-base">No financial records found.</p>
            <p className="text-xs sm:text-sm mt-1 opacity-70">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
