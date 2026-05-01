"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "../../../../../services/auth.service";
import { adminProductsService, AdminProductData } from "../../../../../services/admin-products.service";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  ARCHIVED: "Arquivado",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "#fef3c7",
  ACTIVE: "#dcfce7",
  INACTIVE: "#fee2e2",
  ARCHIVED: "#f3f4f6",
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<AdminProductData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number, q: string, s: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminProductsService.list({ search: q || undefined, status: s || undefined, page: p, limit: 20 });
      setProducts(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.replace("/login"); return; }
    void load(page, search, statusFilter);
  }, [router, load, page, search, statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void load(1, search, statusFilter);
  }

  return (
    <div style={st.page}>
      <header style={st.header}>
        <div style={st.headerLeft}>
          <Link href="/dashboard" style={st.backLink}>← Dashboard</Link>
          <h1 style={st.title}>Produtos</h1>
        </div>
        <Link href="/dashboard/admin/products/new" style={st.newBtn}>+ Novo produto</Link>
      </header>

      <div style={st.filters}>
        <form onSubmit={handleSearch} style={st.searchForm}>
          <input
            style={st.input}
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={st.select} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">Todos os status</option>
            <option value="DRAFT">Rascunho</option>
            <option value="ACTIVE">Ativo</option>
            <option value="INACTIVE">Inativo</option>
            <option value="ARCHIVED">Arquivado</option>
          </select>
          <button type="submit" style={st.searchBtn}>Buscar</button>
        </form>
      </div>

      {error && <div style={st.error}>{error}</div>}

      {loading ? (
        <p style={st.center}>Carregando...</p>
      ) : products.length === 0 ? (
        <div style={st.empty}>
          <p>Nenhum produto encontrado.</p>
          <Link href="/dashboard/admin/products/new" style={st.newBtn}>Criar primeiro produto</Link>
        </div>
      ) : (
        <>
          <div style={st.tableWrap}>
            <table style={st.table}>
              <thead>
                <tr style={st.thead}>
                  <th style={st.th}>Nome</th>
                  <th style={st.th}>Slug</th>
                  <th style={st.th}>Categoria</th>
                  <th style={st.th}>Status</th>
                  <th style={st.th}>Preço base</th>
                  <th style={st.th}>SKUs</th>
                  <th style={st.th}></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={st.tr}>
                    <td style={st.td}><span style={st.productName}>{p.name}</span></td>
                    <td style={st.td}><code style={st.slug}>{p.slug}</code></td>
                    <td style={st.td}>{p.category ?? "—"}</td>
                    <td style={st.td}>
                      <span style={{ ...st.badge, backgroundColor: STATUS_COLORS[p.status] ?? "#f3f4f6" }}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td style={st.td}>R$ {Number(p.basePrice).toFixed(2)}</td>
                    <td style={st.td}>{p.variants?.length ?? 0}</td>
                    <td style={st.td}>
                      <Link href={`/dashboard/admin/products/detail?id=${p.id}`} style={st.editLink}>Editar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={st.pagination}>
            <span style={st.pageInfo}>{total} produto{total !== 1 ? "s" : ""}</span>
            <div style={st.pageButtons}>
              <button style={st.pageBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <span style={st.pageNum}>Pág. {page} / {pages}</span>
              <button style={st.pageBtn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" },
  headerLeft: { display: "flex", alignItems: "center", gap: "1rem" },
  backLink: { color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" },
  title: { margin: 0, fontSize: "1.25rem", fontWeight: 700 },
  newBtn: { padding: "0.5rem 1rem", backgroundColor: "#111827", color: "#fff", textDecoration: "none", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem" },
  filters: { padding: "1rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" },
  searchForm: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  input: { flex: 1, minWidth: "200px", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" },
  select: { padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", backgroundColor: "#fff" },
  searchBtn: { padding: "0.5rem 1rem", backgroundColor: "#374151", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" },
  error: { margin: "1rem 1.5rem", padding: "0.75rem 1rem", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.875rem" },
  center: { textAlign: "center", padding: "3rem", color: "#6b7280" },
  empty: { textAlign: "center", padding: "3rem", color: "#6b7280", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  tableWrap: { overflowX: "auto", margin: "1.5rem" },
  table: { width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" },
  thead: { backgroundColor: "#f9fafb" },
  th: { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" },
  tr: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.875rem 1rem", fontSize: "0.875rem", verticalAlign: "middle" },
  productName: { fontWeight: 600, color: "#111827" },
  slug: { fontSize: "0.8rem", backgroundColor: "#f3f4f6", padding: "0.15rem 0.4rem", borderRadius: "4px", fontFamily: "monospace" },
  badge: { fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "4px" },
  editLink: { color: "#2563eb", textDecoration: "none", fontWeight: 600, fontSize: "0.8rem" },
  pagination: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", backgroundColor: "#fff", borderTop: "1px solid #e5e7eb" },
  pageInfo: { fontSize: "0.875rem", color: "#6b7280" },
  pageButtons: { display: "flex", alignItems: "center", gap: "0.75rem" },
  pageBtn: { padding: "0.4rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", backgroundColor: "#fff" },
  pageNum: { fontSize: "0.875rem", color: "#374151" },
};
