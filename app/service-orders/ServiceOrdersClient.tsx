'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  getAdminServiceOrders,
  createAdminServiceOrder,
  getAdminServiceOrderById,
  deleteAdminServiceOrder,
  type ApiServiceOrderItem,
  type ApiServiceOrderDetail,
  type ServiceOrderStatus,
  type CreateServiceOrderPayload,
  type PaginatedItems
} from '@/lib/api';
import {
  ServiceOrder,
  getOrders,
  saveOrder,
  ORDER_MOCK_EMPLOYEES
} from '@/lib/orderStore';

import { OrderList } from './components/order-list';
import { OrderForm, FormState } from './components/order-form';
import { OrderSent } from './components/order-sent';
import { DeleteModal } from './components/delete-modal';
import { OrderDetailModal } from './components/order-detail-modal';

const EMPTY_FORM = {
  services: [] as any[],
  description: '',
  date: '',
  time: '',
  hallName: '',
  hallLocation: '',
  paymentType: 'single' as const,
  firstInstallmentAmount: '',
  clientId: '',
  clientName: '',
  clientPhone: '',
  isPaid: false,
};

export default function ServiceOrdersClient({
  initialData,
  initialStatuses,
  initialPagination,
}: {
  initialData: ApiServiceOrderItem[] | null;
  initialStatuses: ServiceOrderStatus[];
  initialPagination: PaginatedItems<ApiServiceOrderItem>['pagination'] | null;
}) {
  const { language } = useLanguage();
  const router = useRouter();
  const [token] = useState(() => getToken() ?? '');

  const [view, setView] = useState<'list' | 'form' | 'sent'>('list');
  const [orders, setOrders] = useState<ApiServiceOrderItem[]>(initialData ?? []);
  const [statuses, setStatuses] = useState<ServiceOrderStatus[]>(initialStatuses);
  const [loading, setLoading] = useState(!initialData);
  const [formSubmitting, setFormSubmitting] = useState(false);

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
  const [editing, setEditing] = useState<ServiceOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiServiceOrderItem | null>(null);
  const [createdOrder, setCreatedOrder] = useState<ServiceOrder | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

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
        order_by: orderBy,
        order: orderDir,
      });

      // Filter locally by activeTab if activeTab is not 'all'
      let fetchedItems = res.data.items || [];
      if (activeTab !== 'all') {
        fetchedItems = fetchedItems.filter(item =>
          item.statuses.some(st => st.value === activeTab)
        );
      }

      setOrders(fetchedItems);
      setStatuses(res.data.statuses || []);
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

  const openCreate = () => {
    router.push('/service-orders/new');
  };

  const openDetail = async (order: ApiServiceOrderItem) => {
    setDetailLoading(true);
    setDetailOrder(null);
    try {
      const res = await getAdminServiceOrderById(order.id, token);
      setDetailOrder(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'فشل جلب تفاصيل الطلب');
      setDetailLoading(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOrder(null);
    setDetailLoading(false);
  };

  const openEdit = (order: ApiServiceOrderItem) => {
    const localOrders = getOrders();
    const localOrder = localOrders.find(
      o => o.id === order.reference_label || o.id === `SO-${order.reference_number}`
    );
    if (localOrder) {
      setForm({
        services: localOrder.services.map(s => {
          let empType: 'employee' | 'none' = 'none';
          let empId: number | undefined = undefined;
          if (s.employeeName) {
            const empDb = ORDER_MOCK_EMPLOYEES.find(e => e.name === s.employeeName);
            if (empDb) {
              empType = 'employee';
              empId = empDb.id;
            }
          }

          return {
            id: s.id,
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            serviceNameAr: s.serviceNameAr,
            price: s.price.toString(),
            description: (s as any).description ?? '',
            options: [],
            employeeType: empType,
            employeeId: empId,
          };
        }),
        description: localOrder.description,
        date: localOrder.date,
        time: localOrder.time,
        hallName: localOrder.hallName,
        hallLocation: localOrder.hallLocation,
        paymentType: (localOrder.paymentType === 'single' ? 'single' : 'two_installments') as 'single' | 'two_installments',
        firstInstallmentAmount: (localOrder as any).firstInstallmentAmount?.toString() || '',
        clientId: localOrder.clientId,
        clientName: localOrder.clientName || '',
        clientPhone: localOrder.clientPhone || '',
        isPaid: localOrder.paymentStatus === 'paid',
      });
      setEditing(localOrder);
      setView('form');
    } else {
      toast.error('لم يتم العثور على الطلب محلياً لتعديله');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return;

    setFormSubmitting(true);
    try {
      if (editing) {
        // Edit mode local store fallback
        const servicesList = form.services.map(s => ({
          id: s.id || Math.random().toString(),
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          serviceNameAr: s.serviceNameAr,
          serviceImageUrl: '',
          serviceDescription: '',
          serviceDescriptionAr: '',
          price: parseFloat(s.price) || 0,
          employeeName: '',
          employeePhone: '',
          status: (editing?.services.find(item => item.id === s.id)?.status) ?? ('coming' as const),
        }));

        const order: ServiceOrder = {
          id: editing.id,
          services: servicesList,
          currency: 'KD',
          description: form.description,
          date: form.date,
          time: form.time,
          hallName: form.hallName,
          hallLocation: form.hallLocation,
          paymentType: (form.paymentType === 'single' ? 'single' : 'two_installments') as 'single' | 'two_installments',
          clientId: form.clientId,
          clientName: '',
          clientPhone: '',
          paymentStatus: form.isPaid ? 'paid' : 'unpaid',
          createdAt: editing.createdAt,
        };
        saveOrder(order);
        toast.success(language === 'ar' ? 'تم تحديث الطلب بنجاح' : 'Order updated successfully');
        fetchOrders();
        setView('list');
      } else {
        // Create mode
        const items = form.services.map(s => {
          const optionsPayload: any[] = [];
          for (const opt of s.options) {
            if (opt.type === 'employee') {
              optionsPayload.push({
                service_option_id: opt.service_option_id,
                value: opt.selectedEmployeeIds || [],
              });
            } else if (opt.type === 'color') {
              optionsPayload.push({
                service_option_id: opt.service_option_id,
                value: opt.value || '',
              });
            } else if (opt.type === 'list') {
              optionsPayload.push({
                service_option_id: opt.service_option_id,
                value: String(opt.value),
              });
            } else {
              optionsPayload.push({
                service_option_id: opt.service_option_id,
                value: opt.type === 'number' ? Number(opt.value) : opt.value,
              });
            }
          }

          let employeePayload = undefined;
          if (s.employeeType === 'employee' && s.employeeId) {
            employeePayload = {
              type: 'employee' as const,
              employee_id: s.employeeId,
            };
          }

          return {
            service_id: Number(s.serviceId),
            service_package_id: s.selectedPackageId ? Number(s.selectedPackageId) : undefined,
            addon_ids: s.selectedAddonIds ? s.selectedAddonIds.map(Number) : [],
            options: optionsPayload,
            employee: employeePayload,
            notes: s.description || undefined,
          };
        });

        const payload: CreateServiceOrderPayload = {
          client_id: Number(form.clientId),
          event_date: form.date,
          event_time: form.time,
          hall_name: form.hallName,
          location_url: form.hallLocation || undefined,
          notes: form.description || undefined,
          is_paid: (form.isPaid ? 1 : 0) as 0 | 1,
          payment_type: form.paymentType,
          first_installment_amount: form.paymentType === 'two_installments' ? Number(form.firstInstallmentAmount) : undefined,
          items,
        };

        const res = await createAdminServiceOrder(payload, token);
        toast.success(res.msg || (language === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully'));

        const successOrder: ServiceOrder = {
          id: res.data?.reference_label || `SO-${res.data?.reference_number || 'new'}`,
          services: form.services.map(s => ({
            id: s.id,
            serviceId: s.serviceId,
            serviceName: s.serviceName,
            serviceNameAr: s.serviceNameAr,
            serviceImageUrl: '',
            serviceDescription: '',
            serviceDescriptionAr: '',
            price: parseFloat(s.price) || 0,
            employeeName: s.employeeType === 'employee' ? 'Staff Assigned' : 'None',
            employeePhone: '',
            status: 'coming' as const,
          })),
          currency: 'KD',
          description: form.description,
          date: form.date,
          time: form.time,
          hallName: form.hallName,
          hallLocation: form.hallLocation,
          paymentType: (form.paymentType === 'single' ? 'single' : 'two_installments') as 'single' | 'two_installments',
          clientId: form.clientId,
          clientName: '',
          clientPhone: '',
          paymentStatus: form.isPaid ? 'paid' : 'unpaid',
          createdAt: new Date().toISOString(),
        };

        setCreatedOrder(successOrder);
        fetchOrders();
        setView('sent');
      }
    } catch (err) {
      toast.error((err as Error).message || 'فشل حفظ الطلب');
    } finally {
      setFormSubmitting(false);
    }
  };

  const sendWhatsApp = (phone: string, msg: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const clientMsg = (o: ServiceOrder) => {
    const link = `${window.location.origin}/order-client/${o.id}`;
    if (language === 'ar') {
      return `مرحباً ${o.clientName}!\nطلب الخدمات الخاص بك #${o.id} جاهز.\nاضغط لمشاهدة التفاصيل والدفع: ${link}`;
    }
    return `Hello ${o.clientName}!\nYour Service Order #${o.id} is ready.\nClick to view details and pay: ${link}`;
  };

  const employeeMsg = (o: ServiceOrder, item: any) => {
    const link = `${window.location.origin}/order-employee/${o.id}?itemId=${item.id}`;
    const sName = language === 'ar' ? (item.serviceNameAr || item.serviceName) : item.serviceName;
    if (language === 'ar') {
      return `مرحباً ${item.employeeName}!\nتم تعيينك على خدمة "${sName}" في طلب #${o.id}.\nاضغط لعرض التفاصيل وتحديث الحالة: ${link}`;
    }
    return `Hello ${item.employeeName}!\nYou have been assigned to service "${sName}" in order #${o.id}.\nClick to view details and update status: ${link}`;
  };

  if (view === 'sent' && createdOrder) {
    return (
      <OrderSent
        createdOrder={createdOrder}
        onBackToOrders={() => {
          setCreatedOrder(null);
          setView('list');
        }}
        onAddNewOrder={() => {
          setCreatedOrder(null);
          openCreate();
        }}
        sendWhatsApp={sendWhatsApp}
        clientMsg={clientMsg}
        employeeMsg={employeeMsg}
      />
    );
  }

  // Edit mode — only reached via openEdit(), never for new orders
  if (view === 'form' && editing) {
    return (
      <OrderForm
        form={form}
        setForm={setForm}
        editing={editing}
        loading={formSubmitting}
        onCancel={() => setView('list')}
        onSubmit={handleSubmit}
        token={token}
      />
    );
  }

  return (
    <>
      <OrderDetailModal
        order={detailOrder}
        loading={detailLoading}
        onClose={closeDetail}
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
      </AnimatePresence>

      <OrderList
        orders={orders}
        statuses={statuses}
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
        onCreateNew={openCreate}
        onViewDetail={openDetail}
        onEdit={openEdit}
        onDelete={setDeleteTarget}
      />
    </>
  );
}
