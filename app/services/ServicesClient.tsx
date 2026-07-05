'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n';
import { AnimatePresence } from 'motion/react';
import {
  getServices, getServiceById, createService, updateService, deleteService,
  type ApiService, type ApiServiceDetail, type CreateServicePayload, type PaginatedItems
} from '@/lib/api';
import { getToken } from '@/lib/auth';
import { toast } from 'sonner';

import { ServiceList } from './components/ServiceList';
import { ServiceDetailView } from './components/ServiceDetailView';
import { ServiceModal, DeleteServiceModal, type ServiceFormData } from './components/ServiceModal';

export default function ServicesClient({
  initialData,
  initialPagination,
}: {
  initialData: ApiService[] | null;
  initialPagination: PaginatedItems<ApiService>['pagination'] | null;
}) {
  const { dir, t, language } = useLanguage();
  const [token] = useState(() => getToken() ?? '');

  const [services, setServices] = useState<ApiService[]>(initialData ?? []);
  const [servicesLoading, setServicesLoading] = useState(!initialData);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialPagination?.last_page ?? 1);

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [serviceDetail, setServiceDetail] = useState<ApiServiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [serviceModal, setServiceModal] = useState<{ mode: 'add' | 'edit'; data?: ServiceFormData } | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<ApiService | null>(null);

  const isInitialMount = useRef(true);

  const fetchServices = useCallback(async () => {
    if (!token) return;
    setServicesLoading(true);
    try {
      const res = await getServices({ page, per_page: 15 }, token);
      setServices(res.data.items);
      setTotalPages(res.data.pagination.last_page);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل الخدمات');
    } finally {
      setServicesLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    if (isInitialMount.current && initialData) {
      isInitialMount.current = false;
      return;
    }
    fetchServices();
  }, [fetchServices, initialData]);

  const fetchServiceDetail = useCallback(async () => {
    if (!token || selectedServiceId === null) return;
    setDetailLoading(true);
    try {
      const res = await getServiceById(selectedServiceId, token);
      setServiceDetail(res.data);
    } catch (err) {
      toast.error((err as Error).message || 'فشل تحميل تفاصيل الخدمة');
    } finally {
      setDetailLoading(false);
    }
  }, [token, selectedServiceId]);

  useEffect(() => {
    if (selectedServiceId !== null) {
      fetchServiceDetail();
    } else {
      setServiceDetail(null);
    }
  }, [selectedServiceId, fetchServiceDetail]);

  const refreshDetail = useCallback(() => {
    if (selectedServiceId !== null) {
      fetchServiceDetail();
    }
  }, [selectedServiceId, fetchServiceDetail]);

  const handleSaveService = async (payload: CreateServicePayload) => {
    if (!token) return;
    const saveToast = toast.loading(serviceModal?.mode === 'add' ? 'Creating service...' : 'Saving changes...');
    try {
      if (serviceModal?.mode === 'add') {
        await createService(payload, token);
        toast.success('تم إنشاء الخدمة بنجاح');
      } else if (serviceModal?.mode === 'edit' && serviceModal.data?.id) {
        await updateService(serviceModal.data.id, payload, token);
        toast.success('تم تحديث الخدمة بنجاح');
      }
      setServiceModal(null);
      fetchServices();
    } catch (err) {
      toast.error((err as Error).message || 'فشل حفظ الخدمة');
    } finally {
      toast.dismiss(saveToast);
    }
  };

  const handleDeleteService = async () => {
    if (!token || !serviceToDelete) return;
    const delToast = toast.loading('Deleting service...');
    try {
      await deleteService(serviceToDelete.id, token);
      toast.success('تم حذف الخدمة بنجاح');
      setServiceToDelete(null);
      fetchServices();
    } catch (err) {
      toast.error((err as Error).message || 'فشل حذف الخدمة');
    } finally {
      toast.dismiss(delToast);
    }
  };

  return (
    <>
      <AnimatePresence>
        {serviceModal && (
          <ServiceModal
            mode={serviceModal.mode}
            initial={serviceModal.data}
            onClose={() => setServiceModal(null)}
            onSave={handleSaveService}
            language={language}
          />
        )}
        {serviceToDelete && (
          <DeleteServiceModal
            onClose={() => setServiceToDelete(null)}
            onConfirm={handleDeleteService}
            language={language}
          />
        )}
      </AnimatePresence>

      {selectedServiceId === null ? (
        <ServiceList
          services={services}
          servicesLoading={servicesLoading}
          page={page}
          totalPages={totalPages}
          setPage={setPage}
          onSelectService={setSelectedServiceId}
          onAddService={() => setServiceModal({ mode: 'add', data: { name_ar: '', name_en: '', description_ar: '', description_en: '', sort_order: 0 } })}
          onEditService={(svc) => setServiceModal({ mode: 'edit', data: svc as any })}
          onDeleteService={setServiceToDelete}
          language={language}
          dir={dir}
          t={t}
          token={token}
        />
      ) : (
        <ServiceDetailView
          selectedServiceId={selectedServiceId}
          onBack={() => setSelectedServiceId(null)}
          serviceDetail={serviceDetail}
          detailLoading={detailLoading}
          refresh={refreshDetail}
          language={language}
          dir={dir}
          t={t}
          token={token}
        />
      )}
    </>
  );
}
