"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ordersService,
  CreateManualOrderPayload,
} from "../../../../../services/orders.service";
import { catalogService, ProductData } from "../../../../../services/catalog.service";
import { authStorage } from "../../../../../services/auth.service";

interface SelectedItem {
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  unitPrice: number;
  quantity: number;
}

function formatPrice(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function NewOrderPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    setTenantId(localStorage.getItem("drop:tenant_id") ?? "");
  }, []);

  // Catálogo
  const [catalog, setCatalog] = useState<ProductData[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Itens selecionados
  const [items, setItems] = useState<SelectedItem[]>([]);

  // Formulário cliente
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Endereço
  const [street, setStreet] = useState("");
  const [addrNumber, setAddrNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Submissão
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    catalogService.publicList({ page: 1, limit: 50 })
      .then((res) => setCatalog(res.items))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, []);

  function addVariant(
    variantId: string,
    sku: string,
    variantName: string,
    productName: string,
    price: number
  ) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variantId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { variantId, sku, variantName, productName, unitPrice: price, quantity: 1 }];
    });
  }

  function updateQty(variantId: string, qty: number) {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
    } else {
      setItems((prev) => prev.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i));
    }
  }

  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError("Adicione ao menos um item ao pedido");
      return;
    }
    if (!customerName.trim()) {
      setError("Nome do cliente é obrigatório");
      return;
    }
    if (!street.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setError("Preencha os campos obrigatórios do endereço");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateManualOrderPayload = {
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        shippingAddress: {
          street,
          number: addrNumber || undefined,
          complement: complement || undefined,
          city,
          state,
          postalCode,
          country: "BR",
        },
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      };
      const order = await ordersService.createManual(tenantId, payload);
      router.push(`/dashboard/orders/${order.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <Link href="/dashboard/orders" style={s.backLink}>← Voltar</Link>
        <h1 style={s.title}>Novo Pedido Manual</h1>
      </div>

      <form onSubmit={handleSubmit} style={s.form}>
        {/* ── Seleção de produtos ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Produtos</h2>
          {catalogLoading && <p style={s.muted}>Carregando catálogo…</p>}
          {!catalogLoading && catalog.length === 0 && (
            <p style={s.muted}>Nenhum produto disponível</p>
          )}
          <div style={s.catalogGrid}>
            {catalog.map((p) =>
              p.variants
                .filter((v) => v.isAvailable)
                .map((v) => (
                  <div key={v.id} style={s.catalogCard}>
                    <p style={s.catalogProduct}>{p.name}</p>
                    <p style={s.catalogVariant}>{v.name}</p>
                    <p style={s.catalogSku}>SKU: {v.sku}</p>
                    <p style={s.catalogPrice}>{formatPrice(Number(v.salePrice))}</p>
                    <button
                      type="button"
                      style={s.addBtn}
                      onClick={() => addVariant(v.id, v.sku, v.name, p.name, Number(v.salePrice))}
                    >
                      + Adicionar
                    </button>
                  </div>
                ))
            )}
          </div>

          {items.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h3 style={s.sectionTitle}>Itens do pedido</h3>
              <table style={s.table}>
                <thead>
                  <tr>
                    {["Produto", "SKU", "Qtd", "Unitário", "Subtotal", ""].map((h) => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.variantId}>
                      <td style={s.td}>{i.productName} — {i.variantName}</td>
                      <td style={s.td}><code>{i.sku}</code></td>
                      <td style={s.td}>
                        <input
                          type="number"
                          min={1}
                          value={i.quantity}
                          onChange={(e) => updateQty(i.variantId, Number(e.target.value))}
                          style={s.qtyInput}
                        />
                      </td>
                      <td style={s.td}>{formatPrice(i.unitPrice)}</td>
                      <td style={s.td}>{formatPrice(i.unitPrice * i.quantity)}</td>
                      <td style={s.td}>
                        <button type="button" onClick={() => updateQty(i.variantId, 0)} style={s.removeBtn}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ textAlign: "right", fontWeight: 700, marginTop: "0.5rem" }}>
                Subtotal estimado: {formatPrice(subtotal)}
              </p>
              <p style={{ textAlign: "right", color: "#888", fontSize: "0.8rem" }}>
                * Valor final calculado pelo servidor
              </p>
            </div>
          )}
        </section>

        {/* ── Dados do cliente ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Dados do Cliente</h2>
          <div style={s.fieldGrid}>
            <div>
              <label style={s.label}>Nome *</label>
              <input style={s.input} value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div>
              <label style={s.label}>E-mail</label>
              <input style={s.input} type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Telefone</label>
              <input style={s.input} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>
        </section>

        {/* ── Endereço ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Endereço de Entrega</h2>
          <div style={s.fieldGrid}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={s.label}>Rua / Logradouro *</label>
              <input style={s.input} value={street} onChange={(e) => setStreet(e.target.value)} required />
            </div>
            <div>
              <label style={s.label}>Número</label>
              <input style={s.input} value={addrNumber} onChange={(e) => setAddrNumber(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Complemento</label>
              <input style={s.input} value={complement} onChange={(e) => setComplement(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>Cidade *</label>
              <input style={s.input} value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div>
              <label style={s.label}>Estado *</label>
              <input style={s.input} maxLength={2} placeholder="SP" value={state} onChange={(e) => setState(e.target.value.toUpperCase())} required />
            </div>
            <div>
              <label style={s.label}>CEP *</label>
              <input style={s.input} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
            </div>
          </div>
        </section>

        {/* ── Observações ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Observações</h2>
          <textarea
            style={{ ...s.input, height: 80, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instruções de entrega, personalização, etc."
          />
        </section>

        {error && <p style={s.error}>{error}</p>}

        <button type="submit" disabled={submitting} style={s.submitBtn}>
          {submitting ? "Criando pedido…" : "Criar Pedido"}
        </button>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" },
  backLink: { color: "#666", textDecoration: "none", fontSize: "0.9rem" },
  title: { margin: 0, fontSize: "1.5rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  section: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "1.25rem" },
  sectionTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 },
  catalogGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" },
  catalogCard: { border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.75rem" },
  catalogProduct: { margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.9rem" },
  catalogVariant: { margin: "0 0 0.15rem", fontSize: "0.85rem", color: "#555" },
  catalogSku: { margin: "0 0 0.25rem", fontSize: "0.75rem", color: "#888" },
  catalogPrice: { margin: "0 0 0.5rem", fontWeight: 700 },
  addBtn: { width: "100%", padding: "0.4rem", background: "#111", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.8rem" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" },
  th: { padding: "0.5rem", textAlign: "left", fontSize: "0.8rem", color: "#666", borderBottom: "1px solid #eee" },
  td: { padding: "0.5rem", fontSize: "0.9rem" },
  qtyInput: { width: 60, padding: "0.25rem", border: "1px solid #ddd", borderRadius: 4, textAlign: "center" },
  removeBtn: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 700 },
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  label: { display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#444" },
  input: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.95rem", boxSizing: "border-box" },
  muted: { color: "#888", textAlign: "center" },
  error: { color: "#c00", textAlign: "center", fontWeight: 600 },
  submitBtn: { padding: "0.75rem 2rem", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "1rem", fontWeight: 700, alignSelf: "flex-end" },
};
