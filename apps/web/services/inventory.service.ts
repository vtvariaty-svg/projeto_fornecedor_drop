import { authStorage } from "./auth.service";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface InventoryItemData {
  variantId: string;
  sku: string;
  variantName: string;
  variantStatus: string;
  product: { id: string; name: string; slug: string };
  quantityAvailable: number;
  quantityReserved: number;
  quantityTotal: number;
  inventoryItemId: string | null;
  updatedAt: string | null;
}

export interface InventoryMovementData {
  id: string;
  type: string;
  quantity: number;
  reason: string | null;
  variantId: string;
  referenceType: string | null;
  referenceId: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

export interface InventoryListResponse {
  items: InventoryItemData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface MovementListResponse {
  items: InventoryMovementData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface AdjustInventoryPayload {
  type: "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "MANUAL_CORRECTION" | "RETURN";
  quantity: number;
  reason?: string;
}

async function adminGet<T>(path: string): Promise<T> {
  const token = authStorage.getAccessToken();
  if (!token) throw new Error("Não autenticado");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro");
  }
  return res.json() as Promise<T>;
}

async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const token = authStorage.getAccessToken();
  if (!token) throw new Error("Não autenticado");
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro");
  }
  return res.json() as Promise<T>;
}

export const inventoryService = {
  async list(query: { search?: string; page?: number; limit?: number } = {}): Promise<InventoryListResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return adminGet<InventoryListResponse>(`/admin/inventory${qs ? `?${qs}` : ""}`);
  },

  async getByVariant(variantId: string): Promise<InventoryItemData> {
    return adminGet<InventoryItemData>(`/admin/inventory/${variantId}`);
  },

  async getMovements(variantId: string, query: { page?: number; limit?: number } = {}): Promise<MovementListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return adminGet<MovementListResponse>(`/admin/inventory/${variantId}/movements${qs ? `?${qs}` : ""}`);
  },

  async adjust(variantId: string, payload: AdjustInventoryPayload) {
    return adminPost(`/admin/inventory/${variantId}/adjust`, payload);
  },
};
