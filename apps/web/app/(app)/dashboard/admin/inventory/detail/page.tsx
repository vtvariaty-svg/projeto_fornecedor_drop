"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "../../../../../../services/auth.service";
import { inventoryService, InventoryItemData, InventoryMovementData, AdjustInventoryPayload } from "../../../../../../services/inventory.service";

const MOVEMENT_LABELS: Record<string, string> = {
  ADJUSTMENT_IN: "Entrada manual",
  ADJUSTMENT_OUT: "Saída manual",
  MANUAL_CORRECTION: "Correção manual",
  RETURN: "Devolução",
  RESERVATION: "Reserva",
  RELEASE_RESERVATION: "Liberação de reserva",
  COMMIT_RESERVATION: "Confirmação de venda",
};

const MOVEMENT_COLORS: Record<string, string> = {
  ADJUSTMENT_IN: "#dcfce7",
  RETURN: "#dcfce7",
  RELEASE_RESERVATION: "#dcfce7",
  ADJUSTMENT_OUT: "#fee2e2",
  MANUAL_CORRECTION: "#fef3c7",
  RESERVATION: "#eff6ff",
  COMMIT_RESERVATION: "#f3f4f6",
};

const POSITIVE_TYPES = ["ADJUSTMENT_IN", "RETURN", "RELEASE_RESERVATION"];

function InventoryDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const variantId = searchParams.get("variantId") ?? "";

  const [inventory, setInventory] = useState<InventoryItemData | null>(null);
  const [movements, setMovements] = useState<InventoryMovementData[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movPages, setMovPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMov, setLoadingMov] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [adjustForm, setAdjustForm] = useState<AdjustInventoryPayload>({ type: "ADJUSTMENT_IN", quantity: 1, reason: "" });
  const [adjusting, setAdjusting] = useState(false);

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  }

  const loadInventory = useCallback(async () => {
    if (!variantId) return;
    try {
      const inv = await inventoryService.getByVariant(variantId);
      setInventory(inv);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [variantId]);

  const loadMovements = useCallback(async (p: number) => {
    if (!variantId) return;
    setLoadingMov(true);
    try {
      const res = await inventoryService.getMovements(variantId, { page: p, limit: 20 });
      setMovements(res.items);
      setMovTotal(res.total);
      setMovPages(res.pages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMov(false);
    }
  }, [variantId]);

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.replace("/login"); return; }
    if (!variantId) { router.replace("/dashboard/admin/inventory"); return; }
    void loadInventory();
    void loadMovements(1);
  }, [router, loadInventory, loadMovements, variantId]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (adjustForm.quantity <= 0) { setError("Quantidade deve ser maior que zero"); return; }
    setAdjusting(true);
    setError(null);
    try {
      await inventoryService.adjust(variantId, { ...adjustForm, reason: adjustForm.reason || undefined });
      await Promise.all([loadInventory(), loadMovements(1)]);
      setMovPage(1);
      setAdjustForm({ type: "ADJUSTMENT_IN", quantity: 1, reason: "" });
      flash("Ajuste realizado com sucesso.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdjusting(false);
    }
  }

  if (loading) return <p style={st.center}>Carregando...</p>;
  if (!inventory) return <p style={st.center}>SKU não encontrado.</p>;

  return (
    <div style={st.page}>
      <header style={st.header}>
        <div style={st.headerLeft}>
          <Link href="/dashboard/admin/inventory" style={st.backLink}>← Estoque</Link>
          <div>
            <h1 style={st.title}>{inventory.variantName}</h1>
            <p style={st.subtitle}>{inventory.product.name} · <code style={st.skuCode}>{inventory.sku}</code></p>
          </div>
        </div>
      </header>

      <div style={st.body}>
        {error && <div style={st.error}>{error}</div>}
        {actionMsg && <div style={st.success}>{actionMsg}</div>}

        <div style={st.cards}>
          <div style={{ ...st.card, backgroundColor: "#f0fdf4" }}>
            <div style={st.cardLabel}>Disponível</div>
            <div style={{ ...st.cardValue, color: inventory.quantityAvailable > 0 ? "#059669" : "#dc2626" }}>
              {inventory.quantityAvailable}
            </div>
          </div>
          <div style={{ ...st.card, backgroundColor: "#fffbeb" }}>
            <div style={st.cardLabel}>Reservado</div>
            <div style={{ ...st.cardValue, color: "#d97706" }}>{inventory.quantityReserved}</div>
          </div>
          <div style={{ ...st.card, backgroundColor: "#f9fafb" }}>
            <div style={st.cardLabel}>Total lógico</div>
            <div style={st.cardValue}>{inventory.quantityTotal}</div>
          </div>
        </div>

        <section style={st.section}>
          <h2 style={st.sectionTitle}>Ajustar estoque</h2>
          <form onSubmit={handleAdjust}>
            <div style={st.adjustGrid}>
              <div>
                <label style={st.label}>Tipo de movimentação</label>
                <select style={st.select} value={adjustForm.type} onChange={(e) => setAdjustForm((f) => ({ ...f, type: e.target.value as AdjustInventoryPayload["type"] }))}>
                  <option value="ADJUSTMENT_IN">Entrada manual</option>
                  <option value="ADJUSTMENT_OUT">Saída manual</option>
                  <option value="MANUAL_CORRECTION">Correção manual</option>
                  <option value="RETURN">Devolução</option>
                </select>
              </div>
              <div>
                <label style={st.label}>Quantidade *</label>
                <input style={st.input} type="number" min="1" value={adjustForm.quantity} onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} required />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={st.label}>Motivo</label>
                <input style={st.input} value={adjustForm.reason ?? ""} onChange={(e) => setAdjustForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Descreva o motivo do ajuste..." />
              </div>
            </div>
            <div style={st.formActions}>
              <button type="submit" disabled={adjusting} style={st.adjustBtn}>{adjusting ? "Ajustando..." : "Aplicar ajuste"}</button>
            </div>
          </form>
        </section>

        <section style={st.section}>
          <h2 style={st.sectionTitle}>Histórico de movimentações ({movTotal})</h2>
          {loadingMov ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Carregando...</p>
          ) : movements.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>Nenhuma movimentação registrada.</p>
          ) : (
            <>
              <div style={st.movList}>
                {movements.map((m) => (
                  <div key={m.id} style={{ ...st.movItem, backgroundColor: MOVEMENT_COLORS[m.type] ?? "#f9fafb" }}>
                    <div style={st.movLeft}>
                      <span style={st.movType}>{MOVEMENT_LABELS[m.type] ?? m.type}</span>
                      {m.reason && <span style={st.movReason}>{m.reason}</span>}
                      {m.referenceType && <span style={st.movRef}>{m.referenceType}{m.referenceId ? ` #${m.referenceId.slice(0, 8)}` : ""}</span>}
                    </div>
                    <div style={st.movRight}>
                      <span style={{ ...st.movQty, color: POSITIVE_TYPES.includes(m.type) ? "#059669" : "#dc2626" }}>
                        {POSITIVE_TYPES.includes(m.type) ? "+" : "-"}{m.quantity}
                      </span>
                      <span style={st.movDate}>{new Date(m.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>
                ))}
              </div>
              {movPages > 1 && (
                <div style={st.pagination}>
                  <button style={st.pageBtn} disabled={movPage <= 1} onClick={() => { const p = movPage - 1; setMovPage(p); void loadMovements(p); }}>Anterior</button>
                  <span style={st.pageNum}>Pág. {movPage} / {movPages}</span>
                  <button style={st.pageBtn} disabled={movPage >= movPages} onClick={() => { const p = movPage + 1; setMovPage(p); void loadMovements(p); }}>Próxima</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminInventoryDetailPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Carregando...</p>}>
      <InventoryDetail />
    </Suspense>
  );
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" },
  center: { textAlign: "center", padding: "3rem", color: "#6b7280" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" },
  headerLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  backLink: { color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" },
  title: { margin: "0 0 0.15rem", fontSize: "1.1rem", fontWeight: 700 },
  subtitle: { margin: 0, fontSize: "0.85rem", color: "#6b7280" },
  skuCode: { fontSize: "0.8rem", backgroundColor: "#f3f4f6", padding: "0.1rem 0.35rem", borderRadius: "4px", fontFamily: "monospace" },
  body: { padding: "1.5rem", maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" },
  error: { padding: "0.75rem 1rem", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.875rem" },
  success: { padding: "0.75rem 1rem", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "6px", fontSize: "0.875rem" },
  cards: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" },
  card: { borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.25rem", textAlign: "center" },
  cardLabel: { fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" },
  cardValue: { fontSize: "2rem", fontWeight: 800 },
  section: { backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.5rem" },
  sectionTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 },
  adjustGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  label: { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" },
  input: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" },
  select: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", backgroundColor: "#fff", boxSizing: "border-box" },
  formActions: { display: "flex", justifyContent: "flex-end", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f3f4f6" },
  adjustBtn: { padding: "0.5rem 1.25rem", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" },
  movList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  movItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb" },
  movLeft: { display: "flex", flexDirection: "column", gap: "0.2rem" },
  movType: { fontSize: "0.875rem", fontWeight: 600 },
  movReason: { fontSize: "0.78rem", color: "#6b7280" },
  movRef: { fontSize: "0.72rem", color: "#9ca3af", fontFamily: "monospace" },
  movRight: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" },
  movQty: { fontSize: "1.1rem", fontWeight: 800 },
  movDate: { fontSize: "0.75rem", color: "#9ca3af" },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f3f4f6" },
  pageBtn: { padding: "0.4rem 0.875rem", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem", backgroundColor: "#fff" },
  pageNum: { fontSize: "0.875rem", color: "#374151" },
};
