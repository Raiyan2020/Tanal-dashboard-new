'use client';

export interface ServicePackage {
  id: number;
  service_id: number;
  name_ar: string;
  name_en: string;
  price: number;
  description_ar?: string;
  description_en?: string;
}

export interface ServiceAddon {
  id: number;
  service_id: number;
  name_ar: string;
  name_en: string;
  price: number;
}

const INITIAL_MOCK_PACKAGES: ServicePackage[] = [
  { id: 101, service_id: 1, name_ar: 'الباقة الأولى: 50 صورة', name_en: 'Package 1: 50 Photos', price: 40, description_ar: 'طباعة 50 صورة عالية الدقة', description_en: 'Prints 50 high-res photos' },
  { id: 102, service_id: 1, name_ar: 'الباقة الثانية: 100 صورة', name_en: 'Package 2: 100 Photos', price: 60, description_ar: 'طباعة 100 صورة عالية الدقة', description_en: 'Prints 100 high-res photos' },
  { id: 103, service_id: 1, name_ar: 'الباقة الثالثة: صور غير محدودة', name_en: 'Package 3: Unlimited Photos', price: 80, description_ar: 'طباعة غير محدودة مع نسخة رقمية', description_en: 'Unlimited prints with digital copy' },

  { id: 301, service_id: 4, name_ar: 'الباقة الأولى: عدد 100 عباية', name_en: 'Package 1: 100 Abayas', price: 10, description_ar: 'مناسب للحفلات الصغيرة', description_en: 'Suitable for small events' },
  { id: 302, service_id: 4, name_ar: 'الباقة الثانية: عدد 200 عباية', name_en: 'Package 2: 200 Abayas', price: 16, description_ar: 'مناسب للحفلات المتوسطة', description_en: 'Suitable for medium events' },
  { id: 303, service_id: 4, name_ar: 'الباقة الثالثة: عدد لا نهائي من العبايات', name_en: 'Package 3: Unlimited Abayas', price: 30, description_ar: 'تغطية كاملة طوال الحفل', description_en: 'Full coverage throughout the event' }
];

const INITIAL_MOCK_ADDONS: ServiceAddon[] = [
  { id: 201, service_id: 1, name_ar: '3 ساعات إضافية', name_en: '3 Extra Hours', price: 5 },
  { id: 202, service_id: 1, name_ar: '4 ساعات إضافية', name_en: '4 Extra Hours', price: 10 },
  { id: 203, service_id: 1, name_ar: '5 ساعات إضافية', name_en: '5 Extra Hours', price: 20 },

  { id: 401, service_id: 4, name_ar: 'مساعد إضافي واحد', name_en: '+1 Extra Assistant', price: 5 },
  { id: 402, service_id: 4, name_ar: 'مساعدان إضافيان', name_en: '+2 Extra Assistants', price: 10 }
];

export function getMockPackages(): ServicePackage[] {
  if (typeof window === 'undefined') return INITIAL_MOCK_PACKAGES;
  const data = localStorage.getItem('tanal_mock_packages');
  if (!data) {
    localStorage.setItem('tanal_mock_packages', JSON.stringify(INITIAL_MOCK_PACKAGES));
    return INITIAL_MOCK_PACKAGES;
  }
  return JSON.parse(data);
}

export function saveMockPackages(packages: ServicePackage[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tanal_mock_packages', JSON.stringify(packages));
  }
}

export function getMockAddons(): ServiceAddon[] {
  if (typeof window === 'undefined') return INITIAL_MOCK_ADDONS;
  const data = localStorage.getItem('tanal_mock_addons');
  if (!data) {
    localStorage.setItem('tanal_mock_addons', JSON.stringify(INITIAL_MOCK_ADDONS));
    return INITIAL_MOCK_ADDONS;
  }
  return JSON.parse(data);
}

export function saveMockAddons(addons: ServiceAddon[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tanal_mock_addons', JSON.stringify(addons));
  }
}

export function getMockDataForService(serviceId: number) {
  const pkgs = getMockPackages().filter(p => p.service_id === serviceId);
  const ads = getMockAddons().filter(a => a.service_id === serviceId);

  // Fallback to avoid empty state for newly created services
  if (pkgs.length === 0) {
    return {
      packages: [
        { id: Date.now(), service_id: serviceId, name_ar: 'باقة الخدمة القياسية', name_en: 'Standard Service Package', price: 25 }
      ],
      addons: [
        { id: Date.now() + 1, service_id: serviceId, name_ar: 'دعم إضافي في نفس اليوم', name_en: 'Same Day Extra Support', price: 15 }
      ]
    };
  }

  return { packages: pkgs, addons: ads };
}
