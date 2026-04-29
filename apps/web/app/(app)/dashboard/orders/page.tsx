"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ordersService,
  OrderData,
  OrderStatus,
  ShippingAddress,
} from "../../../../services/orders.service";

// ─── Constantes ───────────────────────────────────────────────────────────────

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

const CANCELLABLE: OrderStatus[] = ["CONFIRMED", "PENDING_FULFILLMENT"];

function formatPrice(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getTenantId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("drop:tenant_id") ?? "";
}

// ─── OrderDetail (detalhe via query param ?id=xxx) ────────────────────────────

function OrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [tenantId, setTenantId] = useState("");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    const tid = getTenantId();
    setTenantId(tid);
  }, []);

  useEffect(() => {
    if (!orderId || !tenantId) return;
    setLoading(true);
    ordersService
      .get(tenantId, orderId)
      .then(setOrder)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [orderId, tenantId]);

  async function handleCancel() {
    if (!order || !tenantId) return;
    if (!window.confirm("Confirmar cancelamento do pedido?")) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await ordersService.cancel(tenantId, order.id, "Cancelado pelo lojista");
      setOrder(updated);
    } catch (e) {
      setCancelError((e as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <p style={s.center}>Carregando pedido…</p>;
  if (error) return <p style={{ ...s.center, color: "#c00" }}>{error}</p>;
  if (!order) return null;

  const canCancel = CANCELLABLE.includes(order.status);
  const addr = order.shippingAddressJson as unknown as ShippingAddress;

  return (
    <div>
      <div style={s.detailHeader}>
        <button onClick={onBack} style={s.backBtn}>← Voltar para lista</button>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h2 style={s.detailTitle}>{order.orderNumber}</h2>
          <span style={{ ...s.badge, background: STATUS_COLOR[order.status] + "22", color: STATUS_COLOR[order.status], border: `1px solid ${STATUS_COLOR[order.status]}44` }}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      <div style={s.grid}>
        <div style={s.card}>
          <h3 style={s.cardTitle}>Resumo Financeiro</h3>
          <div style={s.row}><span>Subtotal</span><strong>{formatPrice(Number(order.subtotalAmount))}</strong></div>
          <div style={s.row}><span>Frete</span><strong>{formatPrice(Number(order.shippingAmount))}</strong></div>
          <div style={s.row}><span>Desconto</span><strong>−{formatPrice(Number(order.discountAmount))}</strong></div>
          <div style={{ ...s.row, borderTop: "1px solid #eee", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <strong style={{ fontSize: "1.1rem" }}>{formatPrice(Number(order.totalAmount))}</strong>
          </div>
          <p style={s.meta}>Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}</p>
          {order.cancelledAt && <p style={{ ...s.meta, color: "#ef4444" }}>Cancelado em {new Date(order.cancelledAt).toLocaleString("pt-BR")}</p>}
        </div>

        <div style={s.card}>
          <h3 style={s.cardTitle}>Cliente & Entrega</h3>
          <p style={s.infoLine}><strong>Nome:</strong> {order.customerName}</p>
          {order.customerEmail && <p style={s.infoLine}><strong>E-mail:</strong> {order.customerEmail}</p>}
          {order.customerPhone && <p style={s.infoLine}><strong>Tel:</strong> {order.customerPhone}</p>}
          <p style={{ ...s.infoLine, marginTop: "0.6rem" }}>
            {addr.street}{addr.number ? `, ${addr.number}` : ""}{addr.complement ? ` — ${addr.complement}` : ""}
          </p>
          <p style={s.infoLine}>{addr.city} / {addr.state} — {addr.postalCode}</p>
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.cardTitle}>Itens</h3>
        <table style={s.table}>
          <thead>
            <tr>{["Produto", "SKU", "Qtd", "Unitário", "Subtotal"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td style={s.td}>{item.productNameSnapshot} — {item.variantNameSnapshot}</td>
                <td style={s.td}><code>{item.skuSnapshot}</code></td>
                <td style={s.td}>{item.quantity}</td>
                <td style={s.td}>{formatPrice(Number(item.unitPriceSnapshot))}</td>
                <td style={s.td}>{formatPrice(Number(item.subtotalAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {order.statusHistory && order.statusHistory.length > 0 && (
        <div style={s.card}>
          <h3 style={s.cardTitle}>Histórico de Status</h3>
          <div style={s.timeline}>
            {order.statusHistory.map((h) => (
              <div key={h.id} style={s.timelineItem}>
                <div style={{ ...s.timelineDot, background: STATUS_COLOR[h.toStatus] }} />
                <div>
                  <p style={s.timelineStatus}>
                    {h.fromStatus && <><span style={{ color: "#888" }}>{STATUS_LABEL[h.fromStatus]}</span> → </>}
                    <strong style={{ color: STATUS_COLOR[h.toStatus] }}>{STATUS_LABEL[h.toStatus]}</strong>
                  </p>
                  {h.reason && <p style={s.timelineReason}>{h.reason}</p>}
                  <p style={s.timelineDate}>{new Date(h.createdAt).toLocaleString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canCancel && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          {cancelError && <p style={{ color: "#c00", fontWeight: 600 }}>{cancelError}</p>}
          <button onClick={handleCancel} disabled={cancelling} style={s.cancelBtn}>
            {cancelling ? "Cancelando…" : "Cancelar Pedido"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── OrderList ────────────────────────────────────────────────────────────────

function OrdersPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");

  const [tenantId, setTenantId] = useState("");
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    setTenantId(getTenantId());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ordersService.list(tenantId, { search: debouncedSearch || undefined, page });
      setOrders(res.items);
      setPages(res.pages);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, debouncedSearch, page]);

  useEffect(() => { void load(); }, [load]);

  function selectOrder(id: string) {
    router.push(`/dashboard/orders?id=${id}`);
  }

  function goBack() {
    router.push("/dashboard/orders");
  }

  // ── Detalhe ──
  if (selectedId) {
    return (
      <div style={s.container}>
        <OrderDetail orderId={selectedId} onBack={goBack} />
      </div>
    );
  }

  // ── Lista ──
  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Meus Pedidos</h1>
        <Link href="/dashboard/orders/new" style={s.newBtn}>+ Novo Pedido</Link>
      </div>

      <input
        style={s.search}
        placeholder="Buscar por número, cliente ou e-mail…"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
      />

      {loading && <p style={s.muted}>Carregando pedidos…</p>}
      {error && <p style={{ ...s.muted, color: "#c00" }}>{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <p style={s.muted}>
          Nenhum pedido encontrado.{" "}
          <Link href="/dashboard/orders/new" style={{ color: "#3b82f6" }}>Criar pedido</Link>
        </p>
      )}

      {!loading && orders.length > 0 && (
        <>
          <p style={s.muted}>{total} pedido{total !== 1 ? "s" : ""}</p>
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
                  <tr key={o.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td style={s.td}><span style={s.orderNum}>{o.orderNumber}</span></td>
                    <td style={s.td}>{o.customerName}</td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: STATUS_COLOR[o.status] + "22", color: STATUS_COLOR[o.status], border: `1px solid ${STATUS_COLOR[o.status]}44` }}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td style={s.td}>{o.items?.length ?? 0}</td>
                    <td style={s.td}>{formatPrice(Number(o.totalAmount))}</td>
                    <td style={s.td}>{new Date(o.createdAt).toLocaleDateString("pt-BR")}</td>
                    <td style={s.td}>
                      <button onClick={() => selectOrder(o.id)} style={s.detailLink}>Ver</button>
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

// ─── Page export (Suspense necessário para useSearchParams) ───────────────────

export default function OrdersPage() {
  return (
    <Suspense fallback={<p style={s.center}>Carregando…</p>}>
      <OrdersPageInner />
    </Suspense>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 980, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { margin: 0, fontSize: "1.5rem" },
  newBtn: { background: "#111", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: 8, textDecoration: "none", fontSize: "0.9rem", fontWeight: 600 },
  search: { width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "1rem", marginBottom: "1.25rem", boxSizing: "border-box" },
  center: { textAlign: "center", marginTop: "2rem", fontFamily: "system-ui, sans-serif" },
  muted: { color: "#888", textAlign: "center", marginTop: "1.5rem" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "0.65rem 0.75rem", textAlign: "left", fontSize: "0.8rem", color: "#666", borderBottom: "2px solid #eee", whiteSpace: "nowrap" },
  td: { padding: "0.75rem", fontSize: "0.9rem", verticalAlign: "middle" },
  orderNum: { fontFamily: "monospace", fontWeight: 600 },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600 },
  detailLink: { background: "none", border: "none", color: "#3b82f6", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem" },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1.5rem" },
  pageBtn: { padding: "0.4rem 0.9rem", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", background: "#fff" },
  // Detalhe
  detailHeader: { marginBottom: "1.5rem" },
  detailTitle: { margin: 0, fontSize: "1.4rem", display: "inline" },
  backBtn: { background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "0.9rem", marginBottom: "0.5rem", display: "block", padding: 0 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "1.25rem", marginBottom: "1rem" },
  cardTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, borderBottom: "1px solid #eee", paddingBottom: "0.5rem" },
  row: { display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.95rem" },
  meta: { margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#888" },
  infoLine: { margin: "0.2rem 0", fontSize: "0.9rem" },
  timeline: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  timelineItem: { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  timelineDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 5 },
  timelineStatus: { margin: "0 0 0.15rem", fontSize: "0.9rem" },
  timelineReason: { margin: "0 0 0.1rem", fontSize: "0.8rem", color: "#555" },
  timelineDate: { margin: 0, fontSize: "0.75rem", color: "#999" },
  cancelBtn: { padding: "0.65rem 1.5rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 },
};
