// ── Tanal Service Order Store ──
// Shared types and localStorage CRUD used by admin, client, and employee pages.

import type { OrderOptionValue } from './serviceOptionsStore';
export type { OrderOptionValue };

export interface OrderServiceItem {
  id: string; // unique item id
  serviceId: string;
  serviceName: string;
  serviceNameAr: string;
  serviceImageUrl: string;
  serviceDescription: string;
  serviceDescriptionAr: string;
  price: number;
  employeeName: string;
  employeePhone: string;
  status: 'coming' | 'in-progress' | 'finished' | 'rejected';
  optionValues?: OrderOptionValue[]; // filled service option values
}

export interface ServiceOrder {
  id: string;
  services: OrderServiceItem[];
  currency: string;
  description: string;      // admin-written extra notes
  date: string;             // 'YYYY-MM-DD'
  time: string;             // 'HH:mm'
  hallName: string;
  hallLocation: string;     // Google Maps URL
  paymentType: 'single' | 'two_installments';
  clientId: string;
  clientName: string;
  clientPhone: string;
  paymentStatus: 'unpaid' | 'paid';
  createdAt: string;        // ISO date string
}

export type OrderStatus = OrderServiceItem['status'];
export type PaymentStatus = ServiceOrder['paymentStatus'];

// Helper function to derive overall status of the order from its service items
export function getOverallStatus(order: ServiceOrder): OrderStatus {
  if (!order.services || order.services.length === 0) return 'coming';
  const statuses = order.services.map(s => s.status);
  if (statuses.every(s => s === 'finished')) return 'finished';
  if (statuses.includes('rejected')) return 'rejected';
  if (statuses.includes('in-progress')) return 'in-progress';
  return 'coming';
}

// ── Shared mock data (mirrors data in other pages) ──────────────────────────

export const ORDER_MOCK_SERVICES = [
  { id: 'ps1', nameEn: 'Photobooth', nameAr: 'الفوتوبوث', descriptionEn: 'Interactive photobooth with premium props and instant printing.', descriptionAr: 'بوث تصوير تفاعلي مع إكسسوارات فاخرة وطباعة فورية.', imageUrl: '' },
  { id: 'ps2', nameEn: 'Barcode', nameAr: 'الباركود', descriptionEn: 'Digital barcode check-in system for events.', descriptionAr: 'نظام تسجيل الحضور الرقمي عبر الباركود.', imageUrl: '' },
  { id: 'ps3', nameEn: 'Photography Cover', nameAr: 'كفرات منع التصوير', descriptionEn: 'Photography covers to manage camera-free zones at events.', descriptionAr: 'كفرات منع التصوير لإدارة المناطق الخاصة في الحفلات.', imageUrl: '' },
  { id: 'ps4', nameEn: 'Coat & Abaya Hanging Service', nameAr: 'خدمة تعليق العبايات والمعاطف', descriptionEn: 'Professional coat and abaya hanging service for event guests.', descriptionAr: 'خدمة تعليق العبايات والمعاطف للضيوف بشكل احترافي.', imageUrl: '' },
  { id: 'ps5', nameEn: 'Welcoming & Cheering Service', nameAr: 'خدمة التهليل والترحيب', descriptionEn: 'Elegant welcoming and cheering service for your event guests.', descriptionAr: 'خدمة ترحيب وتهليل أنيقة لضيوف مناسباتك.', imageUrl: '' },
];

export const ORDER_MOCK_CLIENTS = [
  { id: '1001', name: 'Abdulrahman Al Saud', phone: '+966501234567' },
  { id: '1002', name: 'Mohammed Al Rajhi', phone: '+966559876543' },
  { id: '1003', name: 'Sara Al Olayan', phone: '+966534567890' },
  { id: '1004', name: 'Fahad Al Jasser', phone: '+966561112222' },
  { id: '1005', name: 'Ahmed Abdullah', phone: '+201013633154' },
];

export const ORDER_MOCK_EMPLOYEES = [
  { id: 1, name: 'Tarik Admin', phone: '+966501112222' },
  { id: 2, name: 'Laila Staff', phone: '+966552223333' },
  { id: 3, name: 'Ahmed', phone: '+201013644154' },
];

// ── localStorage store ────────────────────────────────────────────────────────

const STORAGE_KEY = 'tanal_service_orders_v2';

const SEED_ORDERS: ServiceOrder[] = [
  {
    id: 'SO-2001',
    services: [
      {
        id: 'item-1',
        serviceId: 's4',
        serviceName: 'Photobooth',
        serviceNameAr: 'بوث التصوير',
        serviceImageUrl: '',
        serviceDescription: 'Interactive photobooth with premium props and instant printing.',
        serviceDescriptionAr: 'بوث تصوير تفاعلي مع إكسسوارات فاخرة وطباعة فورية.',
        price: 2500,
        employeeName: 'Tarik Admin',
        employeePhone: '+966501112222',
        status: 'coming',
      }
    ],
    currency: 'KD',
    description: 'Setup at main hall entrance. Needs 3×3m space with a nearby power outlet.',
    date: '2026-10-24',
    time: '19:00',
    hallName: 'Boulevard Mall – Grand Hall',
    hallLocation: 'https://maps.google.com/?q=Boulevard+Mall+Riyadh',
    paymentType: 'single',
    clientId: '1001',
    clientName: 'Abdulrahman Al Saud',
    clientPhone: '+966501234567',
    paymentStatus: 'unpaid',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'SO-2002',
    services: [
      {
        id: 'item-2',
        serviceId: 's1',
        serviceName: 'Wedding Planning',
        serviceNameAr: 'تنظيم حفلات الزفاف',
        serviceImageUrl: '',
        serviceDescription: 'Luxurious wedding ceremonies tailored to your vision.',
        serviceDescriptionAr: 'حفلات زفاف فاخرة مصممة وفق رؤيتك.',
        price: 15000,
        employeeName: 'Laila Staff',
        employeePhone: '+966552223333',
        status: 'in-progress',
      }
    ],
    currency: 'KD',
    description: 'Full wedding planning including décor, catering coordination, entertainment, and photography.',
    date: '2026-11-15',
    time: '20:00',
    hallName: 'Al Faisaliah Hotel – Ballroom',
    hallLocation: 'https://maps.google.com/?q=Al+Faisaliah+Hotel+Riyadh',
    paymentType: 'two_installments',
    clientId: '1003',
    clientName: 'Sara Al Olayan',
    clientPhone: '+966534567890',
    paymentStatus: 'paid',
    createdAt: new Date().toISOString(),
  },
];

export function getOrders(): ServiceOrder[] {
  if (typeof window === 'undefined') return SEED_ORDERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ORDERS));
      return [...SEED_ORDERS];
    }
    return JSON.parse(raw) as ServiceOrder[];
  } catch {
    return [...SEED_ORDERS];
  }
}

export function saveOrder(order: ServiceOrder): void {
  if (typeof window === 'undefined') return;
  const orders = getOrders();
  const idx = orders.findIndex(o => o.id === order.id);
  if (idx >= 0) orders[idx] = order;
  else orders.unshift(order);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function deleteOrder(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getOrders().filter(o => o.id !== id)));
}

export function getOrderById(id: string): ServiceOrder | undefined {
  return getOrders().find(o => o.id === id);
}

export function updateServiceItemStatus(orderId: string, itemId: string, status: OrderStatus): void {
  const order = getOrderById(orderId);
  if (order) {
    const item = order.services.find(s => s.id === itemId);
    if (item) {
      item.status = status;
      saveOrder(order);
    }
  }
}

export function updatePaymentStatus(id: string, paymentStatus: PaymentStatus): void {
  const order = getOrderById(id);
  if (order) { order.paymentStatus = paymentStatus; saveOrder(order); }
}

export function generateOrderId(): string {
  const nums = getOrders().map(o => parseInt(o.id.replace('SO-', ''))).filter(n => !isNaN(n));
  return `SO-${(nums.length > 0 ? Math.max(...nums) : 2000) + 1}`;
}
