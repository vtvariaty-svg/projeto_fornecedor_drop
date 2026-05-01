import { authStorage } from "./auth.service";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface AdminProductVariantData {
  id: string;
  sku: string;
  name: string;
  color: string | null;
  material: string | null;
  size: string | null;
  hardware: string | null;
  salePrice: number;
  costPrice: number | null;
  weightGrams: number | null;
  status: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductMediaData {
  id: string;
  url: string | null;
  storageKey: string | null;
  altText: string | null;
  sortOrder: number;
  productId: string;
  variantId: string | null;
  createdAt: string;
}

export interface AdminProductData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  category: string | null;
  basePrice: number;
  costPrice: number | null;
  createdAt: string;
  updatedAt: string;
  variants?: AdminProductVariantData[];
  media?: AdminProductMediaData[];
}

export interface AdminProductListResponse {
  items: AdminProductData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateProductPayload {
  name: string;
  slug: string;
  description?: string;
  status?: string;
  category?: string;
  basePrice: number;
  costPrice?: number;
}

export interface CreateVariantPayload {
  sku: string;
  name: string;
  color?: string;
  material?: string;
  size?: string;
  hardware?: string;
  salePrice: number;
  costPrice?: number;
  weightGrams?: number;
  status?: string;
}

export interface AddMediaPayload {
  url?: string;
  storageKey?: string;
  altText?: string;
  sortOrder?: number;
  variantId?: string;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = authStorage.getAccessToken();
  if (!token) throw new Error("Não autenticado");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const adminProductsService = {
  async list(query: { search?: string; status?: string; category?: string; page?: number; limit?: number } = {}): Promise<AdminProductListResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.status) params.set("status", query.status);
    if (query.category) params.set("category", query.category);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return adminFetch<AdminProductListResponse>(`/admin/products${qs ? `?${qs}` : ""}`);
  },

  async get(id: string): Promise<AdminProductData> {
    return adminFetch<AdminProductData>(`/admin/products/${id}`);
  },

  async create(payload: CreateProductPayload): Promise<AdminProductData> {
    return adminFetch<AdminProductData>("/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: Partial<CreateProductPayload>): Promise<AdminProductData> {
    return adminFetch<AdminProductData>(`/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async archive(id: string): Promise<AdminProductData> {
    return adminFetch<AdminProductData>(`/admin/products/${id}/archive`, { method: "PATCH" });
  },

  async publish(id: string): Promise<AdminProductData> {
    return adminFetch<AdminProductData>(`/admin/products/${id}/publish`, { method: "PATCH" });
  },

  async unpublish(id: string): Promise<AdminProductData> {
    return adminFetch<AdminProductData>(`/admin/products/${id}/unpublish`, { method: "PATCH" });
  },

  async createVariant(productId: string, payload: CreateVariantPayload): Promise<AdminProductVariantData> {
    return adminFetch<AdminProductVariantData>(`/admin/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateVariant(productId: string, variantId: string, payload: Partial<CreateVariantPayload>): Promise<AdminProductVariantData> {
    return adminFetch<AdminProductVariantData>(`/admin/products/${productId}/variants/${variantId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  async activateVariant(productId: string, variantId: string): Promise<AdminProductVariantData> {
    return adminFetch<AdminProductVariantData>(`/admin/products/${productId}/variants/${variantId}/activate`, { method: "PATCH" });
  },

  async deactivateVariant(productId: string, variantId: string): Promise<AdminProductVariantData> {
    return adminFetch<AdminProductVariantData>(`/admin/products/${productId}/variants/${variantId}/deactivate`, { method: "PATCH" });
  },

  async getMedia(productId: string): Promise<AdminProductMediaData[]> {
    return adminFetch<AdminProductMediaData[]>(`/admin/products/${productId}/media`);
  },

  async addMedia(productId: string, payload: AddMediaPayload): Promise<AdminProductMediaData> {
    return adminFetch<AdminProductMediaData>(`/admin/products/${productId}/media`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async deleteMedia(productId: string, mediaId: string): Promise<void> {
    return adminFetch<void>(`/admin/products/${productId}/media/${mediaId}`, { method: "DELETE" });
  },
};
