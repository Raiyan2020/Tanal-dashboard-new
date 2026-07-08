'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  createAdminServiceOrder,
  type CreateServiceOrderPayload,
} from '@/lib/api';
import { saveOrder, type ServiceOrder } from '@/lib/orderStore';
import {
  OrderForm,
  type FormState,
  createEmptyServiceItem,
} from '../components/order-form';

const EMPTY_FORM: FormState = {
  services: [createEmptyServiceItem()],
  description: '',
  date: '',
  time: '',
  hallName: '',
  hallLocation: '',
  paymentType: 'single',
  firstInstallmentAmount: '',
  clientId: '',
  clientName: '',
  clientPhone: '',
  isPaid: false,
};

interface CreateOrderClientProps {
  token: string;
}

export function CreateOrderClient({ token: serverToken }: CreateOrderClientProps) {
  const router = useRouter();
  const { language } = useLanguage();

  // Prefer the client-side token (fresher) but fall back to the server-rendered one
  const [token] = useState(() => getToken() ?? serverToken);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) return;

    setSubmitting(true);
    try {
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

        let employeePayload: { type: 'employee'; employee_id: number } | undefined;
        if (s.employeeType === 'employee' && s.employeeId) {
          employeePayload = { type: 'employee', employee_id: s.employeeId };
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
        first_installment_amount:
          form.paymentType === 'two_installments'
            ? Number(form.firstInstallmentAmount)
            : undefined,
        items,
      };

      const res = await createAdminServiceOrder(payload, token);

      // Persist to local store so the list page has fresh data
      const newOrder: ServiceOrder = {
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
        paymentType: form.paymentType === 'single' ? 'single' : 'two_installments',
        clientId: form.clientId,
        clientName: form.clientName,
        clientPhone: form.clientPhone,
        paymentStatus: form.isPaid ? 'paid' : 'unpaid',
        createdAt: new Date().toISOString(),
      };
      saveOrder(newOrder);

      toast.success(
        res.msg ||
          (language === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully')
      );
      router.push('/service-orders');
    } catch (err) {
      toast.error((err as Error).message || 'فشل حفظ الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OrderForm
      form={form}
      setForm={setForm}
      editing={null}
      loading={submitting}
      onCancel={() => router.push('/service-orders')}
      onSubmit={handleSubmit}
      token={token}
    />
  );
}
