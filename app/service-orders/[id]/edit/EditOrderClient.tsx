'use client';

import React, { useState, useEffect } from 'react';
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
  hydrateOrderFormItems,
  buildUpdatePayload,
  serviceItemDesignErrorsFromApi,
  validateOrderForm,
  type FormState,
  type OrderFormErrors,
} from '@/lib/service-order-form';
import { OrderForm } from '../../components/order-form';
import { Loader2 } from 'lucide-react';

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
  // The order detail carries the saved option values and addons but not their
  // definitions, so the catalogue has to be pulled in before the form can show
  // them. Update replaces `items[]` wholesale, so saving before this lands
  // would drop every option and addon on the order.
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // No `setHydrating(true)` here — it starts true, and a re-run (language
    // change) should refresh the labels without blanking the form.
    hydrateOrderFormItems(order, token, language as 'ar' | 'en')
      .then(({ items, failed }) => {
        if (cancelled) return;
        setForm(prev => ({ ...prev, services: items }));
        if (failed > 0) {
          toast.error(
            language === 'ar'
              ? 'تعذر تحميل خيارات بعض الخدمات — راجعها قبل الحفظ'
              : 'Some services could not be loaded — review them before saving'
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(
            language === 'ar' ? 'تعذر تحميل تفاصيل الخدمات' : 'Failed to load service details'
          );
        }
      })
      .finally(() => { if (!cancelled) setHydrating(false); });
    return () => { cancelled = true; };
  }, [order, token, language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Saving mid-hydration would send half-empty items and wipe the rest.
    if (hydrating) return;

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
        const itemDesignErrors = serviceItemDesignErrorsFromApi(form, field => err.fieldError(field));
        setErrors({
          client: err.fieldError('client.phone') ?? err.fieldError('client_id'),
          client_alt_phone: err.fieldError('client.alt_phone'),
          event_date: err.fieldError('event_date'),
          event_time: err.fieldError('event_time'),
          event_end_time: err.fieldError('event_end_time'),
          hall_name: err.fieldError('hall_name'),
          items: err.fieldError('items'),
          invitation_design: err.fieldError('invitation_design_token'),
          item_designs: Object.keys(itemDesignErrors).length > 0 ? itemDesignErrors : undefined,
        });
        if (Object.keys(itemDesignErrors).length > 0) {
          setForm(prev => ({
            ...prev,
            services: prev.services.map(item => itemDesignErrors[item.id]
              ? {
                  ...item,
                  designToken: '',
                  designPreviewUrl: '',
                  designExpiresAt: '',
                }
              : item),
          }));
        }
      }
      toast.error((err as Error).message || 'فشل حفظ الطلب');
    } finally {
      setSubmitting(false);
    }
  };

  if (hydrating) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
