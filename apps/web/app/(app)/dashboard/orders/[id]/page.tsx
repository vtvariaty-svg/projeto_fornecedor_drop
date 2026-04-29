"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ordersService,
  OrderData,
  OrderStatus,
} from "../../../../../services/orders.service";
import { authStorage } from "../../../../../services/auth.service";

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

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    setTenantId(localStorage.getItem("drop:tenant_id") ?? "");
  }, []);

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !tenantId) return;
    ordersService
      .get(tenantId, id)
      .then(setOrder)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, tenantId]);

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

  if (loading) return <p style={{ textAlign: "center", marginTop: "3rem", fontFamily: "system-ui" }}>Carregando pedido…</p>;
  if (error) return <p style={{ textAlign: "center", marginTop: "3rem", color: "#c00", fontFamily: "system-ui" }}>{error}</p>;
  if (!order) return null;

  const canCancel = CANCELLABLE.includes(order.status);
  const addr = order.shippingAddressJson as Record<string, string>;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <Link href="/dashboard/orders" style={s.backLink}>← Pedidos</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1 style={s.title}>{order.orderNumber}</h1>
          <span style={{ ...s.badge, background: STATUS_COLOR[order.status] + "22", color: STATUS_COLOR[order.status], border: `1px solid ${STATUS_COLOR[order.status]}44` }}>
            {STATUS_LABEL[order.status]}
          </span>
        </div>
      </div>

      <div style={s.grid}>
        {/* ── Resumo financeiro ── */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Resumo</h2>
          <div style={s.row}><span>Subtotal</span><strong>{formatPrice(Number(order.subtotalAmount))}</strong></div>
          <div style={s.row}><span>Frete</span><strong>{formatPrice(Number(order.shippingAmount))}</strong></div>
          <div style={s.row}><span>Desconto</span><strong>−{formatPrice(Number(order.discountAmount))}</strong></div>
          <div style={{ ...s.row, borderTop: "1px solid #eee", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <strong style={{ fontSize: "1.2rem" }}>{formatPrice(Number(order.totalAmount))}</strong>
          </div>
          <p style={s.meta}>Criado em {new Date(order.createdAt).toLocaleString("pt-BR")}</p>
          {order.cancelledAt && (
            <p style={{ ...s.meta, color: "#ef4444" }}>Cancelado em {new Date(order.cancelledAt).toLocaleString("pt-BR")}</p>
          )}
        </div>

        {/* ── Dados do cliente ── */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Cliente</h2>
          <p style={s.infoLine}><strong>Nome:</strong> {order.customerName}</p>
          {order.customerEmail && <p style={s.infoLine}><strong>E-mail:</strong> {order.customerEmail}</p>}
          {order.customerPhone && <p style={s.infoLine}><strong>Telefone:</strong> {order.customerPhone}</p>}
          <p style={{ ...s.infoLine, marginTop: "0.75rem" }}><strong>Endereço:</strong></p>
          <p style={s.infoLine}>
            {addr.street}{addr.number ? `, ${addr.number}` : ""}{addr.complement ? ` — ${addr.complement}` : ""}
          </p>
          <p style={s.infoLine}>{addr.city} / {addr.state} — {addr.postalCode}</p>
        </div>
      </div>

      {/* ── Itens ── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Itens</h2>
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

      {/* ── Histórico de status ── */}
      {order.statusHistory && order.statusHistory.length > 0 && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Histórico de Status</h2>
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

      {/* ── Ações ── */}
      {canCancel && (
        <div style={s.actions}>
          {cancelError && <p style={s.error}>{cancelError}</p>}
          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={s.cancelBtn}
          >
            {cancelling ? "Cancelando…" : "Cancelar Pedido"}
          </button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  header: { marginBottom: "1.5rem" },
  backLink: { color: "#666", textDecoration: "none", fontSize: "0.9rem", display: "block", marginBottom: "0.5rem" },
  title: { margin: 0, fontSize: "1.4rem", display: "inline" },
  badge: { display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: 20, fontSize: "0.8rem", fontWeight: 600 },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "1.25rem", marginBottom: "1rem" },
  cardTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, borderBottom: "1px solid #eee", paddingBottom: "0.5rem" },
  row: { display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.95rem" },
  meta: { margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#888" },
  infoLine: { margin: "0.2rem 0", fontSize: "0.9rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.8rem", color: "#666", borderBottom: "2px solid #eee" },
  td: { padding: "0.65rem 0.75rem", fontSize: "0.9rem", borderBottom: "1px solid #f5f5f5" },
  timeline: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  timelineItem: { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  timelineDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 5 },
  timelineStatus: { margin: "0 0 0.15rem", fontSize: "0.9rem" },
  timelineReason: { margin: "0 0 0.1rem", fontSize: "0.8rem", color: "#555" },
  timelineDate: { margin: 0, fontSize: "0.75rem", color: "#999" },
  actions: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" },
  error: { color: "#c00", fontWeight: 600 },
  cancelBtn: { padding: "0.65rem 1.5rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700 },
};
