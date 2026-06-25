'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Search, Eye, Edit2, Trash2, UserSearch,
  ChevronLeft, ChevronRight, ChevronDown, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { toast } from 'sonner';

import { type Client } from './_types';
import { ClientEditForm } from './_client-form';
import { ClientDetails } from './_client-details';
import { ClientDeleteModal } from './_client-delete-modal';
import { getClients, type PaginatedItems } from '@/lib/api';
import { getToken } from '@/lib/auth';

const PER_PAGE_OPTIONS = [10, 15, 25, 50];

export default function ClientsPage() {
  const { t, dir } = useLanguage();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    setToken(getToken() ?? '');
  }, []);

  // ── list state ──
  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<PaginatedItems<Client>['pagination'] | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── view state ──
  const [isEditing, setIsEditing] = useState(false);
  const [clientIdToEdit, setClientIdToEdit] = useState<number | null>(null);
  const [clientToView, setClientToView] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  // ── fetch clients ──
  const fetchClients = useCallback(async () => {
    if (!token) return;
    setListLoading(true);
    try {
      const res = await getClients(token, { page, per_page: perPage, keyword: keyword || undefined });
      setClients(res.data.items);
      setPagination(res.data.pagination);
    } catch (err) {
      toast.error((err as Error).message || 'حدث خطأ أثناء تحميل العملاء');
    } finally {
      setListLoading(false);
    }
  }, [token, page, perPage, keyword]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── debounced search ──
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setKeyword(val);
      setPage(1);
    }, 500);
  };

  // ── CRUD handlers ──
  const handleSaveClient = (savedClient: Client) => {
    setIsEditing(false);
    setClientIdToEdit(null);
    fetchClients();
    if (clientToView?.id === savedClient.id) {
      setClientToView(savedClient);
    }
  };

  const handleDeleted = () => {
    setClientToDelete(null);
    setClientToView(null);
    fetchClients();
  };

  /* ── FORM view ── */
  if (isEditing) {
    return (
      <ClientEditForm
        clientId={clientIdToEdit}
        onBack={() => { setIsEditing(false); setClientIdToEdit(null); }}
        onSaved={handleSaveClient}
      />
    );
  }

  /* ── DETAIL view ── */
  if (clientToView) {
    return (
      <>
        <ClientDetails
          client={clientToView}
          onBack={() => setClientToView(null)}
          onEdit={() => { setClientIdToEdit(clientToView.id); setIsEditing(true); }}
          onDelete={() => setClientToDelete(clientToView)}
        />
        <AnimatePresence>
          {clientToDelete && (
            <ClientDeleteModal
              client={clientToDelete}
              onClose={() => setClientToDelete(null)}
              onConfirmed={handleDeleted}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  /* ── LIST view ── */
  return (
    <>
      <AnimatePresence>
        {clientToDelete && (
          <ClientDeleteModal
            client={clientToDelete}
            onClose={() => setClientToDelete(null)}
            onConfirmed={handleDeleted}
          />
        )}
      </AnimatePresence>

      <div className="space-y-6 pb-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <h2 className={cn('text-2xl font-medium text-secondary', dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold')}>
              {t('clients')}
            </h2>
            {pagination && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {pagination.total}
              </span>
            )}
          </div>

          <button
            onClick={() => { setClientIdToEdit(null); setIsEditing(true); }}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('addClient' as any)}
          </button>
        </div>

        {/* Search + list panel */}
        <div className="glass-panel rounded-3xl p-3 sm:p-6 w-full mx-auto overflow-hidden">
          {/* Search & Per-page */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 sm:mb-6">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary/40" />
              <input
                type="text"
                placeholder={t('searchClients')}
                value={searchInput}
                onChange={e => handleSearchChange(e.target.value)}
                className="w-full bg-white/50 border border-secondary/10 rounded-xl py-2.5 ps-10 pe-4 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            {/* Per-page */}
            <div className="relative shrink-0">
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="appearance-none bg-white/50 border border-secondary/10 rounded-xl px-4 py-2.5 pe-8 text-sm text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer h-full"
              >
                {PER_PAGE_OPTIONS.map(n => (
                  <option key={n} value={n}>{n} لكل صفحة</option>
                ))}
              </select>
              <ChevronDown className="absolute top-1/2 -translate-y-1/2 end-2.5 w-3.5 h-3.5 text-secondary/40 pointer-events-none" />
            </div>
          </div>

          {/* Client list */}
          <div className="w-full">
            {listLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : clients.length > 0 ? (
              <div className="flex flex-col gap-2 sm:gap-3 w-full">
                <AnimatePresence mode="popLayout">
                  {clients.map(client => (
                    <ClientListRow
                      key={client.id}
                      client={client}
                      onView={() => setClientToView(client)}
                      onEdit={() => { setClientIdToEdit(client.id); setIsEditing(true); }}
                      onDelete={() => setClientToDelete(client)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-secondary/40 text-center px-4">
                <UserSearch className="w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">{t('noDataFound' as any) || 'No clients found.'}</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && !listLoading && (
            <Pagination pagination={pagination} onPage={p => setPage(p)} />
          )}
        </div>
      </div>
    </>
  );
}

/* ─── ClientListRow — local to page, not reused elsewhere ──────── */
interface ClientListRowProps {
  client: Client;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ClientListRow({ client, onView, onEdit, onDelete }: ClientListRowProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onView}
      className="p-3 sm:p-4 rounded-2xl bg-white/40 shadow-sm border border-secondary/5 flex flex-col md:flex-row md:items-center justify-between gap-3 group cursor-pointer hover:bg-white/60 transition-colors w-full"
    >
      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-secondary/5 px-2 py-0.5 rounded text-secondary/60">
            {client.reference_label || `#${client.id}`}
          </span>
          <h3 className="font-semibold text-secondary text-base truncate m-0">{client.name}</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-secondary/60 gap-0.5 sm:gap-3">
          <span className="truncate max-w-full" dir="ltr">
            {client.full_phone || `${client.country_code} ${client.phone}`}
          </span>
          {client.email && (
            <>
              <span className="hidden sm:block w-1 h-1 rounded-full bg-secondary/20 shrink-0" />
              <span className="truncate max-w-full">{client.email}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-2 flex-wrap shrink-0 justify-end border-t border-secondary/5 md:border-none pt-2 md:pt-0 mt-1 md:mt-0"
        onClick={e => e.stopPropagation()}
      >
        {/* WhatsApp */}
        {client.whatsapp_url && (
          <button
            title="WhatsApp"
            onClick={() => window.open(client.whatsapp_url, '_blank')}
            className="p-2 sm:p-2.5 bg-white text-emerald-600 border border-transparent hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
          >
            <Image
              src="https://raiyansoft.com/wp-content/uploads/2026/05/whatsapp.png"
              alt="WhatsApp"
              width={18}
              height={18}
              className="object-contain"
              referrerPolicy="no-referrer"
            />
          </button>
        )}
        {/* View */}
        <button
          title={t('view')}
          onClick={onView}
          className="p-2 sm:p-2.5 bg-white text-secondary/60 border border-transparent hover:bg-gray-50 hover:border-gray-200 hover:text-gray-900 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>
        {/* Edit */}
        <button
          title={t('edit' as any)}
          onClick={onEdit}
          className="p-2 sm:p-2.5 bg-white text-yellow-500 border border-transparent hover:bg-yellow-50 hover:border-yellow-200 hover:text-yellow-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        {/* Delete */}
        <button
          title={t('remove')}
          onClick={onDelete}
          className="p-2 sm:p-2.5 bg-white text-red-500 border border-transparent hover:bg-red-50 hover:border-red-200 hover:text-red-600 hover:-translate-y-[2px] hover:scale-[1.03] hover:shadow-md active:scale-95 rounded-xl transition-all duration-200 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Pagination ───────────────────────────────────────────────── */
function Pagination({
  pagination,
  onPage,
}: {
  pagination: PaginatedItems<Client>['pagination'];
  onPage: (p: number) => void;
}) {
  const { last_page, current_page } = pagination;
  if (last_page <= 1) return null;

  const pages = Array.from({ length: last_page }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-center gap-2 pt-4 flex-wrap">
      <button
        onClick={() => onPage(current_page - 1)}
        disabled={current_page === 1}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          className={cn(
            'w-9 h-9 rounded-xl text-sm font-medium transition-all cursor-pointer',
            p === current_page
              ? 'bg-primary text-white shadow-md'
              : 'bg-white/50 border border-secondary/10 hover:bg-white/80 text-secondary',
          )}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(current_page + 1)}
        disabled={current_page === last_page}
        className="p-2 rounded-xl bg-white/50 border border-secondary/10 hover:bg-white/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
