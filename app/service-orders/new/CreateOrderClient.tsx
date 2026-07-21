'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import { getToken } from '@/lib/auth';
import { createAdminServiceOrder, ApiError } from '@/lib/api';
import {
  createEmptyOrderForm,
  buildCreatePayload,
  validateOrderForm,
  type FormState,
  type OrderFormErrors,
} from '@/lib/service-order-form';
import { OrderForm } from '../components/order-form';

interface CreateOrderClientProps {
  token: string;
}

export function CreateOrderClient({ token: serverToken }: CreateOrderClientProps) {
  const router = useRouter();
  const { language } = useLanguage();

  // Prefer the client-side token (fresher) but fall back to the server-rendered one
  const [token] = useState(() => getToken() ?? serverToken);

  const [form, setForm] = useState<FormState>(createEmptyOrderForm);
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
      const res = await createAdminServiceOrder(buildCreatePayload(form), token);
      toast.success(
        res.msg || (language === 'ar' ? 'تم إنشاء الطلب بنجاح' : 'Order created successfully')
      );

      // Quick orders wait on the client to fill in their own details.
      if (form.creationMode === 'quick') {
        toast.info(
          language === 'ar'
            ? 'تم إرسال نموذج استكمال البيانات للعميل عبر الواتساب'
            : 'A data-completion form has been sent to the client on WhatsApp'
        );
      }

      // The barcode/QR service makes the backend create an invitation alongside
      // the order — jump straight to it so guests can be added.
      const invitationId = res.data?.invitation_id;
      if (invitationId) {
        toast.success(
          language === 'ar' ? 'تم إنشاء الدعوة تلقائياً' : 'Invitation created automatically'
        );
        router.push(`/invitations?invitationId=${invitationId}`);
      } else {
        router.push('/service-orders');
      }
      router.refresh();
    } catch (err) {
      // Map server-side field errors back onto the form where the names line up.
      if (err instanceof ApiError) {
        const designError = err.fieldError('invitation_design_token');
        setErrors({
          client: err.fieldError('client.phone') ?? err.fieldError('client_id'),
          event_date: err.fieldError('event_date'),
          event_time: err.fieldError('event_time'),
          event_end_time: err.fieldError('event_end_time'),
          hall_name: err.fieldError('hall_name'),
          items: err.fieldError('items'),
          invitation_design: designError,
        });

        // The token is single-use and short-lived, so any rejection of it means
        // the stored one is spent — drop it and make the admin re-upload.
        if (designError) {
          setForm(prev => ({
            ...prev,
            invitationDesignToken: '',
            invitationDesignPreviewUrl: '',
            invitationDesignExpiresAt: '',
          }));
        }
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
      editing={false}
      loading={submitting}
      errors={errors}
      onCancel={() => router.push('/service-orders')}
      onSubmit={handleSubmit}
      token={token}
    />
  );
}
