import { authStorage } from "./auth.service";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export interface TenantData {
  id: string;
  name: string;
  slug: string;
  status: string;
  role: string;
}

async function authedPost<T>(path: string, body?: unknown): Promise<T> {
  const token = authStorage.getAccessToken();
  if (!token) throw new Error("Não autenticado");

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message: string }).message || "Erro");
  }
  return res.json() as Promise<T>;
}

export const tenantsService = {
  /**
   * Cria ou vincula o tenant inicial para o SUPER_ADMIN atual.
   * Idempotente: pode ser chamado várias vezes com segurança.
   * Requer role SUPER_ADMIN no JWT.
   */
  async bootstrapCurrentUserTenant(): Promise<TenantData> {
    return authedPost<TenantData>("/admin/tenants/bootstrap-current-user");
  },
};
