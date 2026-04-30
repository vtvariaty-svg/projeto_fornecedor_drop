import { authStorage } from "./auth.service";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface ProductVariantData {
  id: string;
  sku: string;
  name: string;
  color?: string;
  material?: string;
  size?: string;
  hardware?: string;
  salePrice: number;
  weightGrams?: number;
  status: string;
  isAvailable: boolean;
}

export interface ProductMediaData {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
  variantId?: string;
}

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  category?: string;
  basePrice: number;
  createdAt: string;
  updatedAt: string;
  variants: ProductVariantData[];
  media: ProductMediaData[];
}

export interface CustomizationOptionData {
  id: string;
  name: string;
  description?: string;
  type?: string;
  isActive: boolean;
  requiresApproval: boolean;
  additionalPrice?: number;
}

export interface ProductCustomizationOptionData {
  id: string;
  isRequired: boolean;
  additionalPrice?: number;
  sortOrder: number;
  customizationOption: CustomizationOptionData;
}

export interface CatalogListResponse {
  items: ProductData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CatalogQuery {
  search?: string;
  category?: string;
  sku?: string;
  page?: number;
  limit?: number;
}

async function catalogGet<T>(path: string, tenantId: string): Promise<T> {
  const token = authStorage.getAccessToken();
  if (!token) throw new Error("Não autenticado");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Tenant-ID": tenantId,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro ao buscar catálogo");
  }
  return res.json() as Promise<T>;
}

export const catalogService = {
  async list(tenantId: string, query: CatalogQuery = {}): Promise<CatalogListResponse> {
    const params = new URLSearchParams();
    if (query.search) params.set("search", query.search);
    if (query.category) params.set("category", query.category);
    if (query.sku) params.set("sku", query.sku);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return catalogGet<CatalogListResponse>(`/catalog/products${qs ? `?${qs}` : ""}`, tenantId);
  },

  async getBySlug(slug: string, tenantId: string): Promise<ProductData> {
    return catalogGet<ProductData>(`/catalog/products/${slug}`, tenantId);
  },

  async getCustomizationOptions(slug: string, tenantId: string): Promise<ProductCustomizationOptionData[]> {
    return catalogGet<ProductCustomizationOptionData[]>(`/catalog/products/${slug}/customization-options`, tenantId);
  },
};
