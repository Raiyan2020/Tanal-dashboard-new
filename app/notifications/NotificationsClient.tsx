'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Trash2, UserPlus, FileText, QrCode, Loader2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { getToken } from '@/lib/auth';
import { usePermissions } from '@/hooks/use-permissions';
import {
  clearAllNotifications,
  deleteNotifications,
  getNotifications,
  type AdminNotification,
  type PaginatedItems,
} from '@/lib/api';

const PER_PAGE = 15;

/**
 * Icon and colour per backend category. `NotificationTypeEnum` resolves every
 * payload to one of these four, so the fallback only guards against a category
 * added server-side before this map is updated.
 */
const TYPE_STYLES: Record<AdminNotification['type'], { Icon: typeof Bell; color: string }> = {
  guest_confirmation: { Icon: UserPlus, color: 'bg-blue-100 text-blue-600' },
  payment_received: { Icon: FileText, color: 'bg-emerald-100 text-emerald-600' },
  invitation_qr: { Icon: QrCode, color: 'bg-purple-100 text-purple-600' },
  system_update: { Icon: Bell, color: 'bg-orange-100 text-orange-600' },
};

export default function NotificationsClient({
  initialData,
  initialPagination,
}: {
  initialData: AdminNotification[] | null;
  initialPagination: PaginatedItems<AdminNotification>['pagination'] | null;
}) {
  const { t, dir } = useLanguage();
  const { can } = usePermissions();
  const [token] = useState(() => getToken() ?? '');

  const [items, setItems] = useState<AdminNotification[]>(initialData ?? []);
  const [loading, setLoading] = useState(!initialData);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPagination?.last_page ?? 1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const isInitialMount = useRef(true);

  const canDelete = can('delete-notification');
  const unreadCount = items.filter((n) => !n.is_read).length;

  const fetchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getNotifications(token, { page, per_page: PER_PAGE });
      setItems(res.data.items);
      setTotalPages(res.data.pagination.last_page);
    } catch (err) {
      toast.error((err as Error).message || t('noDataFound'));
    } finally {
      setLoading(false);
    }
  }, [token, page, t]);

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchItems();
  }, [fetchItems, initialData]);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const res = await deleteNotifications([id], token);
      toast.success(res.msg || t('deletedSuccessfully'));
      await fetchItems();
    } catch (err) {
      toast.error((err as Error).message || t('deleteFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      const res = await clearAllNotifications(token);
      toast.success(res.msg || t('deletedSuccessfully'));
      // Clearing empties every page, so go back to the first one.
      if (page !== 1) setPage(1);
      else await fetchItems();
    } catch (err) {
      toast.error((err as Error).message || t('deleteFailed'));
    } finally {
      setClearing(false);
    }
  };

  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2
          className={cn(
            'text-2xl font-medium text-secondary flex items-center gap-2',
            dir === 'ltr' ? 'font-serif' : 'font-arabic font-bold'
          )}
        >
          <Bell className="w-6 h-6 text-primary" />
          {t('notifications')}
          {unreadCount > 0 && (
            <span className="ms-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {unreadCount} {t('unread')}
            </span>
          )}
        </h2>

        {canDelete && items.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={clearing}
            className="text-secondary/60 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {t('clearAllNotifications')}
          </button>
        )}
      </div>

      <div className="glass-panel rounded-3xl p-4 sm:p-6 shadow-sm border border-secondary/5 relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] rounded-3xl flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        <div className="space-y-2">
          {items.map((notification, index) => {
            const { Icon, color } = TYPE_STYLES[notification.type] ?? TYPE_STYLES.system_update;

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  'p-4 rounded-2xl flex gap-4 transition-all border',
                  notification.is_read
                    ? 'bg-transparent border-transparent hover:bg-white/40'
                    : 'bg-white/60 border-primary/10 shadow-sm'
                )}
              >
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', color)}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h4
                      className={cn(
                        'text-secondary truncate',
                        notification.is_read ? 'font-medium' : 'font-semibold'
                      )}
                    >
                      {notification.title}
                    </h4>
                    <div className="flex items-center gap-1 text-xs text-secondary/50 shrink-0 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{notification.time}</span>
                    </div>
                  </div>
                  <p
                    className={cn(
                      'text-sm line-clamp-2',
                      notification.is_read ? 'text-secondary/60' : 'text-secondary/80'
                    )}
                  >
                    {notification.body}
                  </p>
                </div>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(notification.id)}
                    disabled={busyId === notification.id}
                    aria-label={t('delete')}
                    className="self-center p-2 rounded-xl text-secondary/40 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {busyId === notification.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}

          {!loading && items.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-secondary/40 gap-4">
              <Bell className="w-12 h-12 opacity-50" />
              <p>{t('noNotifications')}</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-5 mt-4 border-t border-secondary/5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 rounded-xl bg-white/60 disabled:opacity-40 hover:bg-white transition-colors cursor-pointer"
            >
              <PrevIcon className="w-4 h-4" />
            </button>
            <span className="text-sm text-secondary/60">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 rounded-xl bg-white/60 disabled:opacity-40 hover:bg-white transition-colors cursor-pointer"
            >
              <NextIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
