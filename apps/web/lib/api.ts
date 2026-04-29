// Em produção (mesmo domínio): NEXT_PUBLIC_API_URL não é definido → usa '/api' relativo.
// Em dev local: defina NEXT_PUBLIC_API_URL=http://localhost:3001/api em apps/web/.env.local
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}
