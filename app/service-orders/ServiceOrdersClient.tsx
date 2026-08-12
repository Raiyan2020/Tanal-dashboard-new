'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getAdminServiceOrders,
  getAdminServiceOrderById,
  deleteAdminServiceOrder,
  cancelAdminServiceOrder,
  type ApiServiceOrderItem,
  type ApiServiceOrderDetail,
  type ServiceOrderStatus,
  type ServiceOrderListStatus,
  type ServiceOrdersResponse,
} from '@/lib/api';

import { OrderList } from './components/order-list';
import { DeleteModal } from './components/delete-modal';
import { CancelModal } from './components/cancel-modal';
import { OrderDetailModal } from './components/order-detail-modal';

export default function ServiceOrdersClient({
  initialData,
  initialStatuses,
  initialPaymentStatuses,
  initialPagination,
}: {
  initialData: ApiServiceOrderItem[] | null;
  initialStatuses: ServiceOrderStatus[];
  initialPaymentStatuses: ServiceOrderStatus[];
  initialPagination: ServiceOrdersResponse['pagination'] | null;
}) {
  const { language } = useLanguage();
  const router = useRouter();
  const [token] = useState(() => getToken() ?? '');

  const [orders, setOrders] = useState<ApiServiceOrderItem[]>(initialData ?? []);
  const [statuses, setStatuses] = useState<ServiceOrderStatus[]>(initialStatuses);
  const [paymentStatuses, setPaymentStatuses] = useState<ServiceOrderStatus[]>(initialPaymentStatuses);
  const [loading, setLoading] = useState(!initialData);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [orderBy, setOrderBy] = useState('event_date');
  const [orderDir, setOrderDir] = useState<'ASC' | 'DESC'>('DESC');

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPagination?.last_page ?? 1);
  const [totalItems, setTotalItems] = useState(initialPagination?.total ?? 0);

  // Action states
  const [deleteTarget, setDeleteTarget] = useState<ApiServiceOrderItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ApiServiceOrderItem | null>(null);

  // Detail modal state
  const [detailOrder, setDetailOrder] = useState<ApiServiceOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const isInitialMount = useRef(true);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getAdminServiceOrders(token, {
        page,
        per_page: 15,
        keyword: search || undefined,
        // The API owns status filtering — filtering the current page locally
        // would silently hide matches on other pages.
        status: activeTab === 'all' ? undefined : (activeTab as ServiceOrderListStatus),
        order_by: orderBy,
        order: orderDir,
      });

      setOrders(res.data.items || []);
      setStatuses(res.data.statuses || []);
      setPaymentStatuses(res.data.payment_statuses || []);
      setTotalPages(res.data.pagination.last_page);
      setTotalItems(res.data.pagination.total);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, activeTab, orderBy, orderDir]);

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchOrders();
  }, [fetchOrders, initialData]);

  // Changing a filter invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [search, activeTab, orderBy, orderDir]);

  const openDetail = async (order: ApiServiceOrderItem) => {
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const res = await getAdminServiceOrderById(order.id, token);
      setDetailOrder(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'فشل جلب تفاصيل الطلب');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setDetailLoading(false);
  };

  return (
    <>
      <OrderDetailModal
        order={detailOrder}
        loading={detailLoading}
        token={token}
        onClose={closeDetail}
        onEdit={id => router.push(`/service-orders/${id}/edit`)}
        onChanged={() => {
          closeDetail();
          fetchOrders();
        }}
      />

      <AnimatePresence>
        {deleteTarget && (
          <DeleteModal
            order={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={async () => {
              try {
                await deleteAdminServiceOrder(deleteTarget.id, token);
                toast.success(language === 'ar' ? 'تم حذف الطلب' : 'Order deleted');
              } catch (err) {
                toast.error((err as Error).message || 'فشل حذف الطلب');
              } finally {
                fetchOrders();
                setDeleteTarget(null);
              }
            }}
          />
        )}

        {cancelTarget && (
          <CancelModal
            order={cancelTarget}
            onClose={() => setCancelTarget(null)}
            onConfirm={async () => {
              try {
                await cancelAdminServiceOrder(cancelTarget.id, token);
                toast.success(language === 'ar' ? 'تم إلغاء الطلب' : 'Order cancelled');
              } catch (err) {
                toast.error((err as Error).message || 'فشل إلغاء الطلب');
              } finally {
                fetchOrders();
                setCancelTarget(null);
              }
            }}
          />
        )}
      </AnimatePresence>

      <OrderList
        orders={orders}
        statuses={statuses}
        paymentStatuses={paymentStatuses}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        orderBy={orderBy}
        onOrderByChange={setOrderBy}
        orderDir={orderDir}
        onOrderDirChange={setOrderDir}
        page={page}
        onPageChange={setPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onCreateNew={() => router.push('/service-orders/new')}
        onViewDetail={openDetail}
        onEdit={order => router.push(`/service-orders/${order.id}/edit`)}
        onDelete={setDeleteTarget}
        onCancel={setCancelTarget}
        onRefresh={fetchOrders}
      />
    </>
  );
}
