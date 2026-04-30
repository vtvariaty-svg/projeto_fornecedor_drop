"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ordersService,
  CreateManualOrderPayload,
  OrderItemCustomizationPayload,
} from "../../../../../services/orders.service";
import { catalogService, ProductData, ProductCustomizationOptionData } from "../../../../../services/catalog.service";
import { brandsService, BrandData, BrandAssetData } from "../../../../../services/brands.service";

type OrderMode = "standard" | "whitelabel";

interface SelectedItem {
  variantId: string;
  sku: string;
  variantName: string;
  productName: string;
  productSlug: string;
  unitPrice: number;
  quantity: number;
}

interface ItemCustomization {
  optionId: string;
  optionName: string;
  optionType?: string | null;
  assetId?: string;
  value?: string;
  notes?: string;
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

  // Modo do pedido
  const [orderMode, setOrderMode] = useState<OrderMode>("standard");

  // Catálogo
  const [catalog, setCatalog] = useState<ProductData[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // White label — marcas
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [brandAssets, setBrandAssets] = useState<BrandAssetData[]>([]);

  // Itens selecionados
  const [items, setItems] = useState<SelectedItem[]>([]);

  // Customizações por variantId
  const [itemCustomizations, setItemCustomizations] = useState<Record<string, ItemCustomization[]>>({});
  const [itemCustNotes, setItemCustNotes] = useState<Record<string, string>>({});

  // Opções de personalização por productSlug
  const [productOptions, setProductOptions] = useState<Record<string, ProductCustomizationOptionData[]>>({});

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
  const [addrState, setAddrState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Submissão
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    catalogService
      .list(tenantId, { page: 1, limit: 50 })
      .then((res) => setCatalog(res.items))
      .catch(() => setCatalog([]))
      .finally(() => setCatalogLoading(false));
  }, [tenantId]);

  // Carregar marcas ACTIVE quando modo white label é ativado
  useEffect(() => {
    if (orderMode !== "whitelabel" || !tenantId) return;
    setBrandsLoading(true);
    brandsService
      .list(tenantId, { status: "ACTIVE" })
      .then((res) => setBrands(res.items))
      .catch(() => setBrands([]))
      .finally(() => setBrandsLoading(false));
  }, [orderMode, tenantId]);

  // Carregar assets quando marca é selecionada
  useEffect(() => {
    if (!selectedBrandId || !tenantId) {
      setBrandAssets([]);
      return;
    }
    brandsService
      .listAssets(tenantId, selectedBrandId)
      .then((assets) => setBrandAssets(assets.filter((a) => a.isApproved)))
      .catch(() => setBrandAssets([]));
  }, [selectedBrandId, tenantId]);

  // Carregar opções de personalização por produto (lazy)
  const loadProductOptions = useCallback(
    async (slug: string) => {
      if (!tenantId || productOptions[slug] !== undefined) return;
      try {
        const opts = await catalogService.getCustomizationOptions(slug, tenantId);
        setProductOptions((prev) => ({ ...prev, [slug]: opts }));
      } catch {
        setProductOptions((prev) => ({ ...prev, [slug]: [] }));
      }
    },
    [tenantId, productOptions]
  );

  function addVariant(
    variantId: string,
    sku: string,
    variantName: string,
    productName: string,
    productSlug: string,
    price: number
  ) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variantId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { variantId, sku, variantName, productName, productSlug, unitPrice: price, quantity: 1 }];
    });
    if (orderMode === "whitelabel") {
      void loadProductOptions(productSlug);
    }
  }

  function updateQty(variantId: string, qty: number) {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      setItemCustomizations((prev) => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
    } else {
      setItems((prev) => prev.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i));
    }
  }

  function toggleCustomizationOption(variantId: string, opt: ProductCustomizationOptionData) {
    setItemCustomizations((prev) => {
      const current = prev[variantId] ?? [];
      const exists = current.find((c) => c.optionId === opt.customizationOption.id);
      if (exists) {
        return { ...prev, [variantId]: current.filter((c) => c.optionId !== opt.customizationOption.id) };
      }
      return {
        ...prev,
        [variantId]: [
          ...current,
          {
            optionId: opt.customizationOption.id,
            optionName: opt.customizationOption.name,
            optionType: opt.customizationOption.type,
          },
        ],
      };
    });
  }

  function updateCustAsset(variantId: string, optionId: string, assetId: string) {
    setItemCustomizations((prev) => ({
      ...prev,
      [variantId]: (prev[variantId] ?? []).map((c) =>
        c.optionId === optionId ? { ...c, assetId: assetId || undefined } : c
      ),
    }));
  }

  function updateCustValue(variantId: string, optionId: string, value: string) {
    setItemCustomizations((prev) => ({
      ...prev,
      [variantId]: (prev[variantId] ?? []).map((c) =>
        c.optionId === optionId ? { ...c, value: value || undefined } : c
      ),
    }));
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
      setError("Nome do cliente e obrigatorio");
      return;
    }
    if (!street.trim() || !city.trim() || !addrState.trim() || !postalCode.trim()) {
      setError("Preencha os campos obrigatorios do endereco");
      return;
    }
    if (orderMode === "whitelabel" && !selectedBrandId) {
      setError("Selecione uma marca aprovada para pedido white label");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateManualOrderPayload = {
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        notes: notes || undefined,
        brandId: orderMode === "whitelabel" ? selectedBrandId : undefined,
        shippingAddress: {
          street,
          number: addrNumber || undefined,
          complement: complement || undefined,
          city,
          state: addrState,
          postalCode,
          country: "BR",
        },
        items: items.map((i) => {
          const custs = itemCustomizations[i.variantId] ?? [];
          const custPayload: OrderItemCustomizationPayload[] = custs.map((c) => ({
            optionId: c.optionId,
            assetId: c.assetId,
            value: c.value,
            notes: c.notes,
          }));
          return {
            variantId: i.variantId,
            quantity: i.quantity,
            customizations: custPayload.length > 0 ? custPayload : undefined,
            customizationNotes: itemCustNotes[i.variantId] || undefined,
          };
        }),
      };
      const order = await ordersService.createManual(tenantId, payload);
      router.push(`/dashboard/orders?id=${order.id}`);
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

      {/* ── Modo do pedido ── */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Tipo de Pedido</h2>
        <p style={s.notice}>
          Voce pode vender produtos do catalogo sem marca propria. A marca propria e opcional para pedidos white label.
        </p>
        <div style={s.modeRow}>
          <label style={{ ...s.modeOption, ...(orderMode === "standard" ? s.modeOptionActive : {}) }}>
            <input
              type="radio"
              name="orderMode"
              value="standard"
              checked={orderMode === "standard"}
              onChange={() => { setOrderMode("standard"); setSelectedBrandId(""); }}
              style={{ marginRight: "0.5rem" }}
            />
            Dropshipping padrao
            <span style={s.modeDesc}>Venda produtos existentes sem marca propria</span>
          </label>
          <label style={{ ...s.modeOption, ...(orderMode === "whitelabel" ? s.modeOptionActive : {}) }}>
            <input
              type="radio"
              name="orderMode"
              value="whitelabel"
              checked={orderMode === "whitelabel"}
              onChange={() => setOrderMode("whitelabel")}
              style={{ marginRight: "0.5rem" }}
            />
            Com marca propria / white label
            <span style={s.modeDesc}>Adicione personalizacao com sua marca aprovada</span>
          </label>
        </div>
      </section>

      {/* ── Selecao de marca (white label) ── */}
      {orderMode === "whitelabel" && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Marca</h2>
          {brandsLoading && <p style={s.muted}>Carregando marcas...</p>}
          {!brandsLoading && brands.length === 0 && (
            <p style={{ color: "#b45309" }}>
              Nenhuma marca aprovada encontrada. Va em{" "}
              <Link href="/dashboard/brands" style={{ color: "#3b82f6" }}>Marcas</Link>{" "}
              e aguarde a aprovacao.
            </p>
          )}
          {!brandsLoading && brands.length > 0 && (
            <div>
              <label style={s.label}>Selecionar marca *</label>
              <select
                style={s.select}
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
              >
                <option value="">-- Selecione uma marca --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {selectedBrandId && (
                <p style={{ ...s.muted, marginTop: "0.5rem", textAlign: "left" }}>
                  {brandAssets.length} asset{brandAssets.length !== 1 ? "s" : ""} aprovado{brandAssets.length !== 1 ? "s" : ""} disponivel{brandAssets.length !== 1 ? "is" : ""} para personalizacao
                </p>
              )}
            </div>
          )}
        </section>
      )}

      <form onSubmit={handleSubmit} style={s.form}>
        {/* ── Selecao de produtos ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Produtos</h2>
          {catalogLoading && <p style={s.muted}>Carregando catalogo...</p>}
          {!catalogLoading && catalog.length === 0 && (
            <p style={s.muted}>Nenhum produto disponivel</p>
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
                    {(p as ProductData & { hasCustomization?: boolean }).hasCustomization && orderMode === "whitelabel" && (
                      <span style={s.badgeCust}>Personalizavel</span>
                    )}
                    <button
                      type="button"
                      style={s.addBtn}
                      onClick={() => addVariant(v.id, v.sku, v.name, p.name, p.slug, Number(v.salePrice))}
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
                    {["Produto", "SKU", "Qtd", "Unitario", "Subtotal", ""].map((h) => (
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
                        <button type="button" onClick={() => updateQty(i.variantId, 0)} style={s.removeBtn}>x</button>
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

        {/* ── Personalizacoes (white label) ── */}
        {orderMode === "whitelabel" && selectedBrandId && items.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Personalizacao por Item</h2>
            <p style={s.muted2}>
              Selecione opcoes de personalizacao para cada item. Itens sem opcoes disponiveis serao enviados sem personalizacao.
            </p>
            {items.map((item) => {
              const opts = productOptions[item.productSlug];
              const selectedCusts = itemCustomizations[item.variantId] ?? [];

              if (opts === undefined) {
                void loadProductOptions(item.productSlug);
                return (
                  <div key={item.variantId} style={s.custBlock}>
                    <p style={s.custTitle}>{item.productName} — {item.variantName}</p>
                    <p style={s.muted}>Carregando opcoes...</p>
                  </div>
                );
              }

              if (opts.length === 0) {
                return (
                  <div key={item.variantId} style={s.custBlock}>
                    <p style={s.custTitle}>{item.productName} — {item.variantName}</p>
                    <p style={s.muted}>Sem opcoes de personalizacao para este produto.</p>
                  </div>
                );
              }

              return (
                <div key={item.variantId} style={s.custBlock}>
                  <p style={s.custTitle}>{item.productName} — {item.variantName}</p>
                  <div style={s.optGrid}>
                    {opts.map((opt) => {
                      const sel = selectedCusts.find((c) => c.optionId === opt.customizationOption.id);
                      const isSelected = !!sel;
                      return (
                        <div key={opt.id} style={{ ...s.optCard, ...(isSelected ? s.optCardActive : {}) }}>
                          <label style={{ cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCustomizationOption(item.variantId, opt)}
                              style={{ marginTop: 3 }}
                            />
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
                                {opt.customizationOption.name}
                              </p>
                              {opt.customizationOption.type && (
                                <span style={s.badge}>{opt.customizationOption.type}</span>
                              )}
                              {opt.customizationOption.description && (
                                <p style={s.optDesc}>{opt.customizationOption.description}</p>
                              )}
                              {opt.isRequired && (
                                <span style={s.badgeRequired}>Obrigatoria</span>
                              )}
                            </div>
                          </label>

                          {isSelected && (
                            <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                              {brandAssets.length > 0 && (
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <label style={s.label}>Asset de marca (opcional)</label>
                                  <select
                                    style={s.select}
                                    value={sel.assetId ?? ""}
                                    onChange={(e) => updateCustAsset(item.variantId, opt.customizationOption.id, e.target.value)}
                                  >
                                    <option value="">-- Nenhum asset --</option>
                                    {brandAssets.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.type} — {a.filename}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              <div>
                                <label style={s.label}>Valor / instrucao (opcional)</label>
                                <input
                                  style={s.input}
                                  placeholder="Ex: cor Pantone 485C, frase gravada..."
                                  value={sel.value ?? ""}
                                  onChange={(e) => updateCustValue(item.variantId, opt.customizationOption.id, e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <label style={s.label}>Observacoes deste item</label>
                    <input
                      style={s.input}
                      placeholder="Instrucoes especificas para este item..."
                      value={itemCustNotes[item.variantId] ?? ""}
                      onChange={(e) =>
                        setItemCustNotes((prev) => ({ ...prev, [item.variantId]: e.target.value }))
                      }
                    />
                  </div>
                </div>
              );
            })}
          </section>
        )}

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

        {/* ── Endereco ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Endereco de Entrega</h2>
          <div style={s.fieldGrid}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={s.label}>Rua / Logradouro *</label>
              <input style={s.input} value={street} onChange={(e) => setStreet(e.target.value)} required />
            </div>
            <div>
              <label style={s.label}>Numero</label>
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
              <input style={s.input} maxLength={2} placeholder="SP" value={addrState} onChange={(e) => setAddrState(e.target.value.toUpperCase())} required />
            </div>
            <div>
              <label style={s.label}>CEP *</label>
              <input style={s.input} value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
            </div>
          </div>
        </section>

        {/* ── Observacoes ── */}
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Observacoes do Pedido</h2>
          <textarea
            style={{ ...s.input, height: 80, resize: "vertical" }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Instrucoes gerais de entrega ou observacoes..."
          />
        </section>

        {error && <p style={s.error}>{error}</p>}

        <button type="submit" disabled={submitting} style={s.submitBtn}>
          {submitting ? "Criando pedido..." : "Criar Pedido"}
        </button>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 980, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" },
  backLink: { color: "#666", textDecoration: "none", fontSize: "0.9rem" },
  title: { margin: 0, fontSize: "1.5rem" },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  section: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "1.25rem" },
  sectionTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 },
  notice: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, padding: "0.6rem 1rem", marginBottom: "1rem", color: "#1e40af", fontSize: "0.875rem" },
  modeRow: { display: "flex", gap: "1rem", flexWrap: "wrap" as const },
  modeOption: { flex: 1, minWidth: 220, border: "2px solid #e5e7eb", borderRadius: 8, padding: "1rem", cursor: "pointer", display: "flex", flexDirection: "column" as const, gap: "0.25rem" },
  modeOptionActive: { borderColor: "#3b82f6", background: "#eff6ff" },
  modeDesc: { fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" },
  catalogGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" },
  catalogCard: { border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.75rem" },
  catalogProduct: { margin: "0 0 0.2rem", fontWeight: 600, fontSize: "0.9rem" },
  catalogVariant: { margin: "0 0 0.15rem", fontSize: "0.85rem", color: "#555" },
  catalogSku: { margin: "0 0 0.25rem", fontSize: "0.75rem", color: "#888" },
  catalogPrice: { margin: "0 0 0.5rem", fontWeight: 700 },
  badgeCust: { display: "inline-block", background: "#ede9fe", color: "#5b21b6", fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: 10, marginBottom: "0.35rem", fontWeight: 600 },
  addBtn: { width: "100%", padding: "0.4rem", background: "#111", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.8rem" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "0.5rem" },
  th: { padding: "0.5rem", textAlign: "left", fontSize: "0.8rem", color: "#666", borderBottom: "1px solid #eee" },
  td: { padding: "0.5rem", fontSize: "0.9rem" },
  qtyInput: { width: 60, padding: "0.25rem", border: "1px solid #ddd", borderRadius: 4, textAlign: "center" as const },
  removeBtn: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 700 },
  custBlock: { border: "1px solid #e5e7eb", borderRadius: 6, padding: "1rem", marginBottom: "0.75rem" },
  custTitle: { margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.95rem" },
  optGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.75rem" },
  optCard: { border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.75rem", background: "#fafafa" },
  optCardActive: { border: "1px solid #3b82f6", background: "#eff6ff" },
  optDesc: { margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#6b7280" },
  badge: { display: "inline-block", background: "#f3f4f6", color: "#374151", fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: 10, marginTop: "0.2rem" },
  badgeRequired: { display: "inline-block", background: "#fef3c7", color: "#92400e", fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: 10, marginLeft: "0.3rem" },
  muted: { color: "#888", textAlign: "center" as const },
  muted2: { color: "#6b7280", fontSize: "0.85rem", marginBottom: "0.75rem" },
  fieldGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  label: { display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#444" },
  input: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.95rem", boxSizing: "border-box" as const },
  select: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #ddd", borderRadius: 6, fontSize: "0.95rem", boxSizing: "border-box" as const, background: "#fff" },
  error: { color: "#c00", textAlign: "center" as const, fontWeight: 600 },
  submitBtn: { padding: "0.75rem 2rem", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "1rem", fontWeight: 700, alignSelf: "flex-end" as const },
};
