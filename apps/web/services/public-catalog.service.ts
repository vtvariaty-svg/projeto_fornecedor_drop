const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface PublicProductVariant {
  id: string;
  sku: string;
  name: string;
  color?: string | null;
  material?: string | null;
  size?: string | null;
  hardware?: string | null;
  salePrice?: number | null;
  weightGrams?: number | null;
  status: string;
  isAvailable: boolean;
}

export interface PublicProductMedia {
  id: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
  variantId?: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  category?: string | null;
  basePrice?: number | null;
  hasCustomization: boolean;
  media: PublicProductMedia[];
  variants: PublicProductVariant[];
}

export interface PublicProductListResponse {
  items: PublicProduct[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PublicCatalogQuery {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

async function publicGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro ao buscar catálogo");
  }
  return res.json() as Promise<T>;
}

export const publicCatalogService = {
  async list(query: PublicCatalogQuery = {}): Promise<PublicProductListResponse> {
    const params = new URLSearchParams();
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    if (query.search) params.set("search", query.search);
    if (query.category) params.set("category", query.category);
    const qs = params.toString();
    return publicGet<PublicProductListResponse>(`/api/public/catalog/products${qs ? `?${qs}` : ""}`);
  },

  async getBySlug(slug: string): Promise<PublicProduct> {
    return publicGet<PublicProduct>(`/api/public/catalog/products/${encodeURIComponent(slug)}`);
  },
};
