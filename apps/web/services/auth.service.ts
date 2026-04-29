const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserData;
  tenants: TenantData[];
}

export interface MeResponse {
  user: UserData;
  tenants: TenantData[];
}

const STORAGE_KEYS = {
  accessToken: "drop:access_token",
  refreshToken: "drop:refresh_token",
} as const;

export const authStorage = {
  setTokens(access: string, refresh: string) {
    localStorage.setItem(STORAGE_KEYS.accessToken, access);
    localStorage.setItem(STORAGE_KEYS.refreshToken, refresh);
  },
  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.accessToken);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.refreshToken);
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
  },
};

async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro na requisição");
  }
  return res.json() as Promise<T>;
}

async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Não autorizado");
  return res.json() as Promise<T>;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await apiPost<LoginResponse>("/auth/login", { email, password });
    authStorage.setTokens(data.accessToken, data.refreshToken);
    return data;
  },

  async me(): Promise<MeResponse> {
    const token = authStorage.getAccessToken();
    if (!token) throw new Error("Não autenticado");
    return apiGet<MeResponse>("/auth/me", token);
  },

  async logout(): Promise<void> {
    const refreshToken = authStorage.getRefreshToken();
    if (refreshToken) {
      await apiPost("/auth/logout", { refreshToken }).catch(() => {});
    }
    authStorage.clear();
  },

  isAuthenticated(): boolean {
    return !!authStorage.getAccessToken();
  },
};
