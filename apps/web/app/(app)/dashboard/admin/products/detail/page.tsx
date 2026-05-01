"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "../../../../../../services/auth.service";
import {
  adminProductsService,
  AdminProductData,
  AdminProductVariantData,
  AdminProductMediaData,
  CreateVariantPayload,
} from "../../../../../../services/admin-products.service";

const STATUS_LABELS: Record<string, string> = { DRAFT: "Rascunho", ACTIVE: "Ativo", INACTIVE: "Inativo", ARCHIVED: "Arquivado" };
const STATUS_COLORS: Record<string, string> = { DRAFT: "#fef3c7", ACTIVE: "#dcfce7", INACTIVE: "#fee2e2", ARCHIVED: "#f3f4f6" };

function ProductDetail() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";

  const [product, setProduct] = useState<AdminProductData | null>(null);
  const [media, setMedia] = useState<AdminProductMediaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({ name: "", slug: "", description: "", category: "", basePrice: 0, costPrice: "" });
  const [saving, setSaving] = useState(false);

  const [showSkuForm, setShowSkuForm] = useState(false);
  const [skuForm, setSkuForm] = useState<CreateVariantPayload>({ sku: "", name: "", salePrice: 0 });
  const [savingSku, setSavingSku] = useState(false);

  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editSkuForm, setEditSkuForm] = useState<Partial<CreateVariantPayload>>({});
  const [savingVariant, setSavingVariant] = useState(false);

  const [showMediaForm, setShowMediaForm] = useState(false);
  const [mediaForm, setMediaForm] = useState({ url: "", altText: "", sortOrder: 0 });
  const [savingMedia, setSavingMedia] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      const [p, m] = await Promise.all([
        adminProductsService.get(id),
        adminProductsService.getMedia(id),
      ]);
      setProduct(p);
      setMedia(m);
      setEditForm({
        name: p.name,
        slug: p.slug,
        description: p.description ?? "",
        category: p.category ?? "",
        basePrice: Number(p.basePrice),
        costPrice: p.costPrice != null ? String(p.costPrice) : "",
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.replace("/login"); return; }
    if (!id) { router.replace("/dashboard/admin/products"); return; }
    void loadProduct();
  }, [router, loadProduct, id]);

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 3000);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await adminProductsService.update(id, {
        name: editForm.name,
        slug: editForm.slug,
        description: editForm.description || undefined,
        category: editForm.category || undefined,
        basePrice: editForm.basePrice,
        costPrice: editForm.costPrice ? parseFloat(editForm.costPrice) : undefined,
      });
      setProduct(updated);
      flash("Produto atualizado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusAction(action: "publish" | "unpublish" | "archive") {
    setError(null);
    try {
      let updated: AdminProductData;
      if (action === "publish") updated = await adminProductsService.publish(id);
      else if (action === "unpublish") updated = await adminProductsService.unpublish(id);
      else updated = await adminProductsService.archive(id);
      setProduct(updated);
      flash(`Status atualizado: ${STATUS_LABELS[updated.status]}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCreateSku(e: React.FormEvent) {
    e.preventDefault();
    setSavingSku(true);
    setError(null);
    try {
      const variant = await adminProductsService.createVariant(id, skuForm);
      setProduct((p) => p ? { ...p, variants: [...(p.variants ?? []), variant] } : p);
      setSkuForm({ sku: "", name: "", salePrice: 0 });
      setShowSkuForm(false);
      flash("SKU criado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingSku(false);
    }
  }

  function startEditVariant(v: AdminProductVariantData) {
    setEditingVariantId(v.id);
    setEditSkuForm({ name: v.name, color: v.color ?? "", material: v.material ?? "", size: v.size ?? "", hardware: v.hardware ?? "", salePrice: Number(v.salePrice), costPrice: v.costPrice != null ? Number(v.costPrice) : undefined, weightGrams: v.weightGrams ?? undefined });
  }

  async function handleSaveVariant(variantId: string) {
    setSavingVariant(true);
    setError(null);
    try {
      const updated = await adminProductsService.updateVariant(id, variantId, editSkuForm);
      setProduct((p) => p ? { ...p, variants: (p.variants ?? []).map((v) => v.id === variantId ? updated : v) } : p);
      setEditingVariantId(null);
      flash("SKU atualizado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingVariant(false);
    }
  }

  async function handleVariantStatus(variantId: string, action: "activate" | "deactivate") {
    setError(null);
    try {
      const updated = action === "activate"
        ? await adminProductsService.activateVariant(id, variantId)
        : await adminProductsService.deactivateVariant(id, variantId);
      setProduct((p) => p ? { ...p, variants: (p.variants ?? []).map((v) => v.id === variantId ? updated : v) } : p);
      flash(`SKU ${action === "activate" ? "ativado" : "desativado"}.`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleAddMedia(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaForm.url.trim()) { setError("URL é obrigatória"); return; }
    setSavingMedia(true);
    setError(null);
    try {
      const m = await adminProductsService.addMedia(id, { url: mediaForm.url, altText: mediaForm.altText || undefined, sortOrder: mediaForm.sortOrder });
      setMedia((prev) => [...prev, m]);
      setMediaForm({ url: "", altText: "", sortOrder: 0 });
      setShowMediaForm(false);
      flash("Mídia adicionada.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSavingMedia(false);
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm("Remover esta mídia?")) return;
    setError(null);
    try {
      await adminProductsService.deleteMedia(id, mediaId);
      setMedia((prev) => prev.filter((m) => m.id !== mediaId));
      flash("Mídia removida.");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (loading) return <p style={st.center}>Carregando...</p>;
  if (!product) return <p style={st.center}>Produto não encontrado.</p>;

  const variants = product.variants ?? [];

  return (
    <div style={st.page}>
      <header style={st.header}>
        <div style={st.headerLeft}>
          <Link href="/dashboard/admin/products" style={st.backLink}>← Produtos</Link>
          <h1 style={st.title}>{product.name}</h1>
          <span style={{ ...st.badge, backgroundColor: STATUS_COLORS[product.status] ?? "#f3f4f6" }}>
            {STATUS_LABELS[product.status] ?? product.status}
          </span>
        </div>
        <div style={st.headerActions}>
          {product.status !== "ACTIVE" && product.status !== "ARCHIVED" && (
            <button style={st.publishBtn} onClick={() => handleStatusAction("publish")}>Publicar</button>
          )}
          {product.status === "ACTIVE" && (
            <button style={st.unpublishBtn} onClick={() => handleStatusAction("unpublish")}>Desativar</button>
          )}
          {product.status !== "ARCHIVED" && (
            <button style={st.archiveBtn} onClick={() => handleStatusAction("archive")}>Arquivar</button>
          )}
        </div>
      </header>

      <div style={st.body}>
        {error && <div style={st.error}>{error}</div>}
        {actionMsg && <div style={st.success}>{actionMsg}</div>}

        <section style={st.section}>
          <h2 style={st.sectionTitle}>Dados do produto</h2>
          <form onSubmit={handleSaveProduct}>
            <div style={st.row2}>
              <Field label="Nome *">
                <input style={st.input} value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              </Field>
              <Field label="Slug *">
                <input style={st.input} value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} required />
              </Field>
            </div>
            <Field label="Descrição">
              <textarea style={st.textarea} value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
            </Field>
            <div style={st.row2}>
              <Field label="Categoria">
                <input style={st.input} value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))} />
              </Field>
              <Field label="Preço base (R$) *">
                <input style={st.input} type="number" min="0" step="0.01" value={editForm.basePrice} onChange={(e) => setEditForm((f) => ({ ...f, basePrice: parseFloat(e.target.value) || 0 }))} required />
              </Field>
              <Field label="Custo (R$)">
                <input style={st.input} type="number" min="0" step="0.01" value={editForm.costPrice} onChange={(e) => setEditForm((f) => ({ ...f, costPrice: e.target.value }))} placeholder="Opcional" />
              </Field>
            </div>
            <div style={st.formActions}>
              <button type="submit" disabled={saving} style={st.saveBtn}>{saving ? "Salvando..." : "Salvar produto"}</button>
            </div>
          </form>
        </section>

        <section style={st.section}>
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>SKUs / Variantes ({variants.length})</h2>
            <button style={st.addBtn} onClick={() => setShowSkuForm((v) => !v)}>{showSkuForm ? "Cancelar" : "+ Novo SKU"}</button>
          </div>

          {showSkuForm && (
            <form onSubmit={handleCreateSku} style={st.inlineForm}>
              <h3 style={st.inlineFormTitle}>Novo SKU</h3>
              <div style={st.row3}>
                <Field label="SKU *"><input style={st.input} value={skuForm.sku} onChange={(e) => setSkuForm((f) => ({ ...f, sku: e.target.value }))} required placeholder="EX: BOL-001-PT" /></Field>
                <Field label="Nome *"><input style={st.input} value={skuForm.name} onChange={(e) => setSkuForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ex: Preto / P" /></Field>
                <Field label="Preço venda (R$) *"><input style={st.input} type="number" min="0" step="0.01" value={skuForm.salePrice} onChange={(e) => setSkuForm((f) => ({ ...f, salePrice: parseFloat(e.target.value) || 0 }))} required /></Field>
              </div>
              <div style={st.row3}>
                <Field label="Cor"><input style={st.input} value={skuForm.color ?? ""} onChange={(e) => setSkuForm((f) => ({ ...f, color: e.target.value }))} /></Field>
                <Field label="Material"><input style={st.input} value={skuForm.material ?? ""} onChange={(e) => setSkuForm((f) => ({ ...f, material: e.target.value }))} /></Field>
                <Field label="Tamanho"><input style={st.input} value={skuForm.size ?? ""} onChange={(e) => setSkuForm((f) => ({ ...f, size: e.target.value }))} /></Field>
                <Field label="Ferragem"><input style={st.input} value={skuForm.hardware ?? ""} onChange={(e) => setSkuForm((f) => ({ ...f, hardware: e.target.value }))} /></Field>
                <Field label="Custo (R$)"><input style={st.input} type="number" min="0" step="0.01" value={skuForm.costPrice ?? ""} onChange={(e) => setSkuForm((f) => ({ ...f, costPrice: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="Opcional" /></Field>
                <Field label="Peso (g)"><input style={st.input} type="number" min="0" value={skuForm.weightGrams ?? ""} onChange={(e) => setSkuForm((f) => ({ ...f, weightGrams: e.target.value ? parseInt(e.target.value) : undefined }))} placeholder="Opcional" /></Field>
              </div>
              <div style={st.formActions}>
                <button type="submit" disabled={savingSku} style={st.saveBtn}>{savingSku ? "Criando..." : "Criar SKU"}</button>
              </div>
            </form>
          )}

          {variants.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "0.75rem 0" }}>Nenhum SKU criado.</p>
          ) : (
            <div style={st.variantList}>
              {variants.map((v) => (
                <div key={v.id} style={st.variantCard}>
                  {editingVariantId === v.id ? (
                    <div style={st.editVariantForm}>
                      <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.875rem" }}>Editar SKU: {v.sku}</h4>
                      <div style={st.row3}>
                        <Field label="Nome"><input style={st.input} value={editSkuForm.name ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, name: e.target.value }))} /></Field>
                        <Field label="Preço venda (R$)"><input style={st.input} type="number" min="0" step="0.01" value={editSkuForm.salePrice ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, salePrice: parseFloat(e.target.value) || 0 }))} /></Field>
                        <Field label="Cor"><input style={st.input} value={editSkuForm.color ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, color: e.target.value }))} /></Field>
                        <Field label="Material"><input style={st.input} value={editSkuForm.material ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, material: e.target.value }))} /></Field>
                        <Field label="Tamanho"><input style={st.input} value={editSkuForm.size ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, size: e.target.value }))} /></Field>
                        <Field label="Ferragem"><input style={st.input} value={editSkuForm.hardware ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, hardware: e.target.value }))} /></Field>
                        <Field label="Custo (R$)"><input style={st.input} type="number" min="0" step="0.01" value={editSkuForm.costPrice ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, costPrice: e.target.value ? parseFloat(e.target.value) : undefined }))} /></Field>
                        <Field label="Peso (g)"><input style={st.input} type="number" min="0" value={editSkuForm.weightGrams ?? ""} onChange={(e) => setEditSkuForm((f) => ({ ...f, weightGrams: e.target.value ? parseInt(e.target.value) : undefined }))} /></Field>
                      </div>
                      <div style={st.formActions}>
                        <button style={st.cancelSmBtn} onClick={() => setEditingVariantId(null)}>Cancelar</button>
                        <button style={st.saveBtn} disabled={savingVariant} onClick={() => handleSaveVariant(v.id)}>{savingVariant ? "Salvando..." : "Salvar"}</button>
                      </div>
                    </div>
                  ) : (
                    <div style={st.variantRow}>
                      <div style={st.variantInfo}>
                        <code style={st.skuCode}>{v.sku}</code>
                        <span style={st.variantName}>{v.name}</span>
                        {v.color && <span style={st.variantAttr}>{v.color}</span>}
                        {v.size && <span style={st.variantAttr}>{v.size}</span>}
                        <span style={{ ...st.badge, backgroundColor: STATUS_COLORS[v.status] ?? "#f3f4f6" }}>{STATUS_LABELS[v.status] ?? v.status}</span>
                        <span style={st.variantPrice}>R$ {Number(v.salePrice).toFixed(2)}</span>
                      </div>
                      <div style={st.variantActions}>
                        <Link href={`/dashboard/admin/inventory/detail?variantId=${v.id}`} style={st.linkBtn}>Estoque</Link>
                        <button style={st.editSmBtn} onClick={() => startEditVariant(v)}>Editar</button>
                        {v.status === "ACTIVE"
                          ? <button style={st.warnSmBtn} onClick={() => handleVariantStatus(v.id, "deactivate")}>Desativar</button>
                          : <button style={st.greenSmBtn} onClick={() => handleVariantStatus(v.id, "activate")}>Ativar</button>
                        }
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={st.section}>
          <div style={st.sectionHeader}>
            <h2 style={st.sectionTitle}>Mídia ({media.length})</h2>
            <button style={st.addBtn} onClick={() => setShowMediaForm((v) => !v)}>{showMediaForm ? "Cancelar" : "+ Adicionar mídia"}</button>
          </div>

          {showMediaForm && (
            <form onSubmit={handleAddMedia} style={st.inlineForm}>
              <h3 style={st.inlineFormTitle}>Nova mídia</h3>
              <Field label="URL da imagem *">
                <input style={st.input} type="url" value={mediaForm.url} onChange={(e) => setMediaForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://cdn.example.com/image.jpg" required />
              </Field>
              <div style={st.row2}>
                <Field label="Texto alternativo (alt)">
                  <input style={st.input} value={mediaForm.altText} onChange={(e) => setMediaForm((f) => ({ ...f, altText: e.target.value }))} />
                </Field>
                <Field label="Ordem">
                  <input style={st.input} type="number" min="0" value={mediaForm.sortOrder} onChange={(e) => setMediaForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
                </Field>
              </div>
              <div style={st.formActions}>
                <button type="submit" disabled={savingMedia} style={st.saveBtn}>{savingMedia ? "Adicionando..." : "Adicionar"}</button>
              </div>
            </form>
          )}

          {media.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: "0.75rem 0" }}>Nenhuma mídia cadastrada.</p>
          ) : (
            <div style={st.mediaGrid}>
              {media.map((m) => (
                <div key={m.id} style={st.mediaCard}>
                  {m.url && (
                    <img src={m.url} alt={m.altText ?? ""} style={st.mediaImg} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <div style={st.mediaInfo}>
                    <p style={st.mediaUrl}>{m.url ?? m.storageKey ?? "—"}</p>
                    {m.altText && <p style={st.mediaAlt}>{m.altText}</p>}
                  </div>
                  <button style={st.removeBtn} onClick={() => handleDeleteMedia(m.id)}>Remover</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>{label}</label>
      {children}
    </div>
  );
}

export default function AdminProductDetailPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>Carregando...</p>}>
      <ProductDetail />
    </Suspense>
  );
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" },
  center: { textAlign: "center", padding: "3rem", color: "#6b7280" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap", gap: "0.75rem" },
  headerLeft: { display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" },
  backLink: { color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" },
  title: { margin: 0, fontSize: "1.15rem", fontWeight: 700 },
  badge: { fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.5rem", borderRadius: "4px" },
  headerActions: { display: "flex", gap: "0.5rem" },
  publishBtn: { padding: "0.4rem 0.875rem", backgroundColor: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" },
  unpublishBtn: { padding: "0.4rem 0.875rem", backgroundColor: "#d97706", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" },
  archiveBtn: { padding: "0.4rem 0.875rem", backgroundColor: "#6b7280", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" },
  body: { padding: "1.5rem", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" },
  error: { padding: "0.75rem 1rem", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.875rem" },
  success: { padding: "0.75rem 1rem", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "6px", fontSize: "0.875rem" },
  section: { backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.5rem" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  sectionTitle: { margin: 0, fontSize: "1rem", fontWeight: 700 },
  row2: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" },
  row3: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" },
  input: { width: "100%", padding: "0.45rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "0.45rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box", resize: "vertical" },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f3f4f6" },
  saveBtn: { padding: "0.45rem 1rem", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem" },
  addBtn: { padding: "0.4rem 0.875rem", backgroundColor: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" },
  inlineForm: { backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb", padding: "1.25rem", marginBottom: "1rem" },
  inlineFormTitle: { margin: "0 0 0.75rem", fontSize: "0.9rem", fontWeight: 700 },
  variantList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  variantCard: { border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" },
  variantRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", flexWrap: "wrap", gap: "0.5rem" },
  variantInfo: { display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  skuCode: { fontSize: "0.8rem", backgroundColor: "#f3f4f6", padding: "0.15rem 0.4rem", borderRadius: "4px", fontFamily: "monospace", fontWeight: 700 },
  variantName: { fontSize: "0.875rem", fontWeight: 600 },
  variantAttr: { fontSize: "0.75rem", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "0.1rem 0.35rem", borderRadius: "4px" },
  variantPrice: { fontSize: "0.8rem", fontWeight: 600, color: "#059669" },
  variantActions: { display: "flex", gap: "0.4rem" },
  linkBtn: { padding: "0.3rem 0.65rem", border: "1px solid #d1d5db", borderRadius: "5px", textDecoration: "none", color: "#374151", fontSize: "0.78rem", fontWeight: 600 },
  editSmBtn: { padding: "0.3rem 0.65rem", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "5px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
  warnSmBtn: { padding: "0.3rem 0.65rem", backgroundColor: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "5px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, color: "#92400e" },
  greenSmBtn: { padding: "0.3rem 0.65rem", backgroundColor: "#dcfce7", border: "1px solid #86efac", borderRadius: "5px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, color: "#166534" },
  cancelSmBtn: { padding: "0.35rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", backgroundColor: "#fff" },
  editVariantForm: { padding: "1rem" },
  mediaGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" },
  mediaCard: { border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column" },
  mediaImg: { width: "100%", height: "120px", objectFit: "cover", backgroundColor: "#f3f4f6" },
  mediaInfo: { padding: "0.5rem 0.75rem", flex: 1 },
  mediaUrl: { fontSize: "0.7rem", color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  mediaAlt: { fontSize: "0.75rem", color: "#374151", margin: "0.25rem 0 0" },
  removeBtn: { margin: "0.5rem 0.75rem 0.75rem", padding: "0.3rem 0.65rem", backgroundColor: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 },
};
