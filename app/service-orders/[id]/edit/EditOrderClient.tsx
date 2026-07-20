'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import {
  updateAdminServiceOrder,
  ApiError,
  type ApiServiceOrderDetail,
} from '@/lib/api';
import {
  formStateFromDetail,
  buildUpdatePayload,
  validateOrderForm,
  type FormState,
  type OrderFormErrors,
} from '@/lib/service-order-form';
import { OrderForm } from '../../components/order-form';

interface EditOrderClientProps {
  token: string;
  order: ApiServiceOrderDetail;
}

/**
 * Edits an existing order against the API. Previously this screen read and wrote
 * a localStorage mock, so changes never reached the backend.
 */
export function EditOrderClient({ token: serverToken, order }: EditOrderClientProps) {
  const router = useRouter();
  const { language } = useLanguage();

  const [token] = useState(() => getToken() ?? serverToken);
  const [form, setForm] = useState<FormState>(() => formStateFromDetail(order));
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<OrderFormErrors>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateOrderForm(form, language as 'ar' | 'en');
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    setSubmitting(true);
    try {
      const res = await updateAdminServiceOrder(order.id, buildUpdatePayload(form), token);
      toast.success(
        res.msg || (language === 'ar' ? 'تم تحديث الطلب بنجاح' : 'Order updated successfully')
      );
      router.push('/service-orders');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({
          client: err.fieldError('client.phone') ?? err.fieldError('client_id'),
          event_date: err.fieldError('event_date'),
          event_time: err.fieldError('event_time'),
          event_end_time: err.fieldError('event_end_time'),
          hall_name: err.fieldError('hall_name'),
          items: err.fieldError('items'),
        });
      }
      toast.error((err as Error).message || 'فشل حفظ الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <OrderForm
      form={form}
      setForm={setForm}
      editing
      loading={submitting}
      errors={errors}
      onCancel={() => router.push('/service-orders')}
      onSubmit={handleSubmit}
      token={token}
    />
  );
}
