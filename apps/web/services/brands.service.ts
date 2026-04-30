import { authStorage } from "./auth.service";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type BrandStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type AssetType = "LOGO" | "BANNER" | "LABEL" | "PACKAGING" | "ICON" | "OTHER";

export interface BrandData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: BrandStatus;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  toneOfVoice?: string;
  brandStory?: string;
  guidelines?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  assets?: BrandAssetData[];
}

export interface BrandReadiness {
  brandId: string;
  status: BrandStatus;
  isReadyForWhiteLabel: boolean;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  totalAssets: number;
  approvedAssets: number;
  hasApprovedLogo: boolean;
}

export interface BrandAssetData {
  id: string;
  type: AssetType;
  url: string;
  filename: string;
  mimeType: string;
  storageKey?: string;
  altText?: string;
  sortOrder: number;
  isApproved: boolean;
  approvedAt?: string;
  rejectedAt?: string;
  rejectedReason?: string;
  notes?: string;
  brandId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandListResponse {
  items: BrandData[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateBrandPayload {
  name: string;
  slug: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  toneOfVoice?: string;
}

export interface UpdateBrandPayload {
  name?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  toneOfVoice?: string;
  brandStory?: string;
  guidelines?: string;
}

export interface CreateBrandAssetPayload {
  type: AssetType;
  url: string;
  filename: string;
  mimeType: string;
  altText?: string;
  notes?: string;
}

async function authedRequest<T>(
  path: string,
  opts: RequestInit = {},
  tenantId?: string
): Promise<T> {
  const token = authStorage.getAccessToken();
  if (!token) throw new Error("Nao autenticado");

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

export const brandsService = {
  async list(tenantId: string, query: { status?: string; search?: string; page?: number } = {}): Promise<BrandListResponse> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("search", query.search);
    if (query.page) params.set("page", String(query.page));
    const qs = params.toString();
    return authedRequest<BrandListResponse>(`/brands${qs ? `?${qs}` : ""}`, {}, tenantId);
  },

  async get(tenantId: string, id: string): Promise<BrandData> {
    return authedRequest<BrandData>(`/brands/${id}`, {}, tenantId);
  },

  async create(tenantId: string, payload: CreateBrandPayload): Promise<BrandData> {
    return authedRequest<BrandData>("/brands", { method: "POST", body: JSON.stringify(payload) }, tenantId);
  },

  async update(tenantId: string, id: string, payload: UpdateBrandPayload): Promise<BrandData> {
    return authedRequest<BrandData>(`/brands/${id}`, { method: "PATCH", body: JSON.stringify(payload) }, tenantId);
  },

  async archive(tenantId: string, id: string): Promise<BrandData> {
    return authedRequest<BrandData>(`/brands/${id}/archive`, { method: "PATCH" }, tenantId);
  },

  async listAssets(tenantId: string, brandId: string): Promise<BrandAssetData[]> {
    return authedRequest<BrandAssetData[]>(`/brands/${brandId}/assets`, {}, tenantId);
  },

  async addAsset(tenantId: string, brandId: string, payload: CreateBrandAssetPayload): Promise<BrandAssetData> {
    return authedRequest<BrandAssetData>(
      `/brands/${brandId}/assets`,
      { method: "POST", body: JSON.stringify(payload) },
      tenantId
    );
  },

  async removeAsset(tenantId: string, brandId: string, assetId: string): Promise<{ ok: boolean }> {
    return authedRequest<{ ok: boolean }>(`/brands/${brandId}/assets/${assetId}`, { method: "DELETE" }, tenantId);
  },

  async readiness(tenantId: string, brandId: string): Promise<BrandReadiness> {
    return authedRequest<BrandReadiness>(`/brands/${brandId}/readiness`, {}, tenantId);
  },
};
