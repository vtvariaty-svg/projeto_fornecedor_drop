import { authStorage } from "./auth.service";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PENDING_FULFILLMENT"
  | "FULFILLMENT_IN_PROGRESS"
  | "IN_PRODUCTION"
  | "READY_TO_SHIP"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  complement?: string;
  number?: string;
}

export interface OrderItemData {
  id: string;
  skuSnapshot: string;
  productNameSnapshot: string;
  variantNameSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  subtotalAmount: number;
  productVariantId: string;
}

export interface OrderStatusHistoryData {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  reason: string | null;
  createdAt: string;
}

export interface OrderData {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddressJson: ShippingAddress;
  subtotalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  items?: OrderItemData[];
  statusHistory?: OrderStatusHistoryData[];
}

export interface OrderListResponse {
  items: OrderData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateOrderItemPayload {
  variantId: string;
  quantity: number;
}

export interface CreateManualOrderPayload {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress: ShippingAddress;
  items: CreateOrderItemPayload[];
  notes?: string;
  brandId?: string;
}

async function authedRequest<T>(
  path: string,
  opts: RequestInit = {},
  tenantId?: string
): Promise<T> {
  const token = authStorage.getAccessToken();
  if (!token) throw new Error("Não autenticado");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro");
  }
  return res.json() as Promise<T>;
}

export const ordersService = {
  async list(
    tenantId: string,
    query: { status?: string; search?: string; page?: number } = {}
  ): Promise<OrderListResponse> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("search", query.search);
    if (query.page) params.set("page", String(query.page));
    const qs = params.toString();
    return authedRequest<OrderListResponse>(
      `/orders${qs ? `?${qs}` : ""}`,
      {},
      tenantId
    );
  },

  async get(tenantId: string, orderId: string): Promise<OrderData> {
    return authedRequest<OrderData>(`/orders/${orderId}`, {}, tenantId);
  },

  async createManual(
    tenantId: string,
    payload: CreateManualOrderPayload
  ): Promise<OrderData> {
    return authedRequest<OrderData>(
      `/orders/manual`,
      { method: "POST", body: JSON.stringify(payload) },
      tenantId
    );
  },

  async cancel(
    tenantId: string,
    orderId: string,
    reason?: string
  ): Promise<OrderData> {
    return authedRequest<OrderData>(
      `/orders/${orderId}/cancel`,
      { method: "POST", body: JSON.stringify({ reason }) },
      tenantId
    );
  },
};
