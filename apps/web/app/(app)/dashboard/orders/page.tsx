"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ordersService, OrderData, OrderStatus } from "../../../../services/orders.service";
import { authStorage } from "../../../../services/auth.service";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  PENDING_FULFILLMENT: "Aguardando Fulfillment",
  FULFILLMENT_IN_PROGRESS: "Em Fulfillment",
  IN_PRODUCTION: "Em Produção",
  READY_TO_SHIP: "Pronto para Envio",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  PENDING_FULFILLMENT: "#8b5cf6",
  FULFILLMENT_IN_PROGRESS: "#6366f1",
  IN_PRODUCTION: "#0ea5e9",
  READY_TO_SHIP: "#14b8a6",
  SHIPPED: "#10b981",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
  REFUNDED: "#6b7280",
};

function formatPrice(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const tenantId =
    typeof window !== "undefined"
      ? (localStorage.getItem("drop:tenant_id") ?? "")
      : "";

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ordersService.list(tenantId, {
        search: debouncedSearch || undefined,
        page,
      });
      setOrders(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Meus Pedidos</h1>
        <Link href="/dashboard/orders/new" style={s.newBtn}>
          + Novo Pedido
        </Link>
      </div>

      <input
        style={s.search}
        placeholder="Buscar por número, cliente ou e-mail…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      {loading && <p style={s.muted}>Carregando pedidos…</p>}
      {error && <p style={s.error}>{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <p style={s.muted}>Nenhum pedido encontrado. <Link href="/dashboard/orders/new">Criar pedido</Link></p>
      )}

      {!loading && orders.length > 0 && (
        <>
          <p style={s.muted}>{total} pedido{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}</p>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Número", "Cliente", "Status", "Itens", "Total", "Data", ""].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={s.tr}>
                    <td style={s.td}>
                      <span style={s.orderNum}>{o.orderNumber}</span>
                    </td>
                    <td style={s.td}>{o.customerName}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: STATUS_COLOR[o.status] + "22", color: STATUS_COLOR[o.status], border: `1px solid ${STATUS_COLOR[o.status]}44` }}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td style={s.td}>{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}</td>
                    <td style={s.td}>{formatPrice(Number(o.totalAmount))}</td>
                    <td style={s.td}>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td style={s.td}>
                      <Link href={`/dashboard/orders/${o.id}`} style={s.detailLink}>Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={s.pagination}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={s.pageBtn}>← Anterior</button>
              <span style={s.muted}>Página {page} de {pages}</span>
              <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={s.pageBtn}>Próxima →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { margin: 0, fontSize: "1.5rem" },
  newBtn: { background: "#111", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: 8, textDecoration: "none", fontSize: "0.9rem", fontWeight: 600 },
  search: { width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "1rem", marginBottom: "1.25rem", boxSizing: "border-box" },
  muted: { color: "#888", textAlign: "center", marginTop: "2rem" },
  error: { color: "#c00", textAlign: "center", marginTop: "1rem" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "0.65rem 0.75rem", textAlign: "left", fontSize: "0.8rem", color: "#666", borderBottom: "2px solid #eee", whiteSpace: "nowrap" },
  tr: { borderBottom: "1px solid #f5f5f5" },
  td: { padding: "0.75rem", fontSize: "0.9rem", verticalAlign: "middle" },
  orderNum: { fontFamily: "monospace", fontWeight: 600, color: "#111" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600 },
  detailLink: { color: "#3b82f6", textDecoration: "none", fontWeight: 600 },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1.5rem" },
  pageBtn: { padding: "0.4rem 0.9rem", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#fff" },
};
