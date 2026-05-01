"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "../../../../../services/auth.service";
import { inventoryService, InventoryItemData } from "../../../../../services/inventory.service";

const VARIANT_STATUS_COLORS: Record<string, string> = { ACTIVE: "#dcfce7", INACTIVE: "#fee2e2", DRAFT: "#fef3c7", ARCHIVED: "#f3f4f6" };
const VARIANT_STATUS_LABELS: Record<string, string> = { ACTIVE: "Ativo", INACTIVE: "Inativo", DRAFT: "Rascunho", ARCHIVED: "Arquivado" };

export default function AdminInventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await inventoryService.list({ search: q || undefined, page: p, limit: 20 });
      setItems(res.items);
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
    void load(page, search);
  }, [router, load, page, search]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    void load(1, search);
  }

  return (
    <div style={st.page}>
      <header style={st.header}>
        <div style={st.headerLeft}>
          <Link href="/dashboard" style={st.backLink}>← Dashboard</Link>
          <h1 style={st.title}>Estoque</h1>
        </div>
      </header>

      <div style={st.filters}>
        <form onSubmit={handleSearch} style={st.searchForm}>
          <input style={st.input} placeholder="Buscar por SKU ou produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" style={st.searchBtn}>Buscar</button>
        </form>
      </div>

      {error && <div style={st.error}>{error}</div>}

      {loading ? (
        <p style={st.center}>Carregando...</p>
      ) : items.length === 0 ? (
        <div style={st.empty}>
          <p>Nenhum SKU encontrado.</p>
          <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>Crie SKUs em <Link href="/dashboard/admin/products" style={{ color: "#2563eb" }}>Produtos</Link> para gerenciar estoque.</p>
        </div>
      ) : (
        <>
          <div style={st.tableWrap}>
            <table style={st.table}>
              <thead>
                <tr style={st.thead}>
                  <th style={st.th}>SKU</th>
                  <th style={st.th}>Produto</th>
                  <th style={st.th}>Disponível</th>
                  <th style={st.th}>Reservado</th>
                  <th style={st.th}>Total lógico</th>
                  <th style={st.th}>Status SKU</th>
                  <th style={st.th}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.variantId} style={st.tr}>
                    <td style={st.td}><code style={st.sku}>{item.sku}</code></td>
                    <td style={st.td}><span style={st.productName}>{item.product.name}</span></td>
                    <td style={st.td}>
                      <span style={{ ...st.qty, color: item.quantityAvailable > 0 ? "#059669" : "#dc2626" }}>{item.quantityAvailable}</span>
                    </td>
                    <td style={st.td}><span style={{ ...st.qty, color: "#d97706" }}>{item.quantityReserved}</span></td>
                    <td style={st.td}><span style={st.qty}>{item.quantityTotal}</span></td>
                    <td style={st.td}>
                      <span style={{ ...st.badge, backgroundColor: VARIANT_STATUS_COLORS[item.variantStatus] ?? "#f3f4f6" }}>
                        {VARIANT_STATUS_LABELS[item.variantStatus] ?? item.variantStatus}
                      </span>
                    </td>
                    <td style={st.td}>
                      <Link href={`/dashboard/admin/inventory/detail?variantId=${item.variantId}`} style={st.detailLink}>Ajustar</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={st.pagination}>
            <span style={st.pageInfo}>{total} SKU{total !== 1 ? "s" : ""}</span>
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
  filters: { padding: "1rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" },
  searchForm: { display: "flex", gap: "0.75rem" },
  input: { flex: 1, maxWidth: "400px", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" },
  searchBtn: { padding: "0.5rem 1rem", backgroundColor: "#374151", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" },
  error: { margin: "1rem 1.5rem", padding: "0.75rem 1rem", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.875rem" },
  center: { textAlign: "center", padding: "3rem", color: "#6b7280" },
  empty: { textAlign: "center", padding: "3rem", color: "#6b7280" },
  tableWrap: { overflowX: "auto", margin: "1.5rem" },
  table: { width: "100%", borderCollapse: "collapse", backgroundColor: "#fff", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" },
  thead: { backgroundColor: "#f9fafb" },
  th: { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" },
  tr: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.875rem 1rem", fontSize: "0.875rem", verticalAlign: "middle" },
  sku: { fontSize: "0.8rem", backgroundColor: "#f3f4f6", padding: "0.15rem 0.4rem", borderRadius: "4px", fontFamily: "monospace" },
  productName: { fontWeight: 600 },
  qty: { fontWeight: 700, fontSize: "0.9rem" },
  badge: { fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "4px" },
  detailLink: { color: "#2563eb", textDecoration: "none", fontWeight: 600, fontSize: "0.8rem" },
  pagination: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", backgroundColor: "#fff", borderTop: "1px solid #e5e7eb" },
  pageInfo: { fontSize: "0.875rem", color: "#6b7280" },
  pageButtons: { display: "flex", alignItems: "center", gap: "0.75rem" },
  pageBtn: { padding: "0.4rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", backgroundColor: "#fff" },
  pageNum: { fontSize: "0.875rem", color: "#374151" },
};
