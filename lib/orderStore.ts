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

// ── localStorage store ────────────────────────────────────────────────────────

const STORAGE_KEY = 'tanal_service_orders_v2';

export function getOrders(): ServiceOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? [] : (JSON.parse(raw) as ServiceOrder[]);
  } catch {
    return [];
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
