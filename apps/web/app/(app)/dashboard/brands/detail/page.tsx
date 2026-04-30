"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  brandsService,
  BrandData,
  BrandAssetData,
  BrandReadiness,
  UpdateBrandPayload,
  CreateBrandAssetPayload,
  AssetType,
} from "../../../../../services/brands.service";

const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  LOGO: "Logo",
  BANNER: "Banner",
  LABEL: "Etiqueta",
  PACKAGING: "Embalagem",
  ICON: "Icone",
  OTHER: "Outro",
};

function getTenantId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("drop:tenant_id") ?? "";
}

function BrandDetailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const brandId = searchParams?.get("id") ?? "";

  const [tenantId, setTenantId] = useState("");
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [readiness, setReadiness] = useState<BrandReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateBrandPayload>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [assetForm, setAssetForm] = useState<CreateBrandAssetPayload>({
    type: "LOGO",
    url: "",
    filename: "",
    mimeType: "image/png",
  });
  const [addingAsset, setAddingAsset] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    setTenantId(getTenantId());
  }, []);

  const load = useCallback(async () => {
    if (!tenantId || !brandId) return;
    setLoading(true);
    setError(null);
    try {
      const [data, rdns] = await Promise.all([
        brandsService.get(tenantId, brandId),
        brandsService.readiness(tenantId, brandId).catch(() => null),
      ]);
      setBrand(data);
      setReadiness(rdns);
      setEditForm({
        name: data.name,
        description: data.description ?? "",
        primaryColor: data.primaryColor ?? "",
        secondaryColor: data.secondaryColor ?? "",
        accentColor: data.accentColor ?? "",
        toneOfVoice: data.toneOfVoice ?? "",
        brandStory: data.brandStory ?? "",
        guidelines: data.guidelines ?? "",
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, brandId]);

  useEffect(() => { void load(); }, [load]);

  async function handleSave() {
    if (!tenantId || !brandId) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await brandsService.update(tenantId, brandId, editForm);
      setBrand(updated);
      setEditing(false);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !brandId) return;
    if (!assetForm.url.trim()) { setAssetError("URL obrigatoria"); return; }
    if (!assetForm.filename.trim()) { setAssetError("Nome do arquivo obrigatorio"); return; }

    setAddingAsset(true);
    setAssetError(null);
    try {
      const asset = await brandsService.addAsset(tenantId, brandId, {
        ...assetForm,
        url: assetForm.url.trim(),
        filename: assetForm.filename.trim(),
      });
      setBrand((b) => b ? { ...b, assets: [...(b.assets ?? []), asset] } : b);
      setAssetForm({ type: "LOGO", url: "", filename: "", mimeType: "image/png" });
    } catch (e) {
      setAssetError((e as Error).message);
    } finally {
      setAddingAsset(false);
    }
  }

  async function handleRemoveAsset(assetId: string) {
    if (!tenantId || !brandId) return;
    if (!window.confirm("Remover este asset?")) return;
    try {
      await brandsService.removeAsset(tenantId, brandId, assetId);
      setBrand((b) => b ? { ...b, assets: (b.assets ?? []).filter((a) => a.id !== assetId) } : b);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleArchive() {
    if (!tenantId || !brandId) return;
    if (!window.confirm("Arquivar esta marca? Ela nao sera excluida.")) return;
    setArchiving(true);
    try {
      const updated = await brandsService.archive(tenantId, brandId);
      setBrand(updated);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setArchiving(false);
    }
  }

  if (loading) return <p style={s.center}>Carregando marca…</p>;
  if (error) return <p style={{ ...s.center, color: "#c00" }}>{error}</p>;
  if (!brand) return null;

  const isArchived = brand.status === "ARCHIVED";
  const assets: BrandAssetData[] = brand.assets ?? [];

  const statusLabel: Record<string, string> = {
    DRAFT: "Aguardando revisao",
    ACTIVE: "Aprovada",
    INACTIVE: "Rejeitada",
    ARCHIVED: "Arquivada",
  };
  const statusBg: Record<string, string> = {
    DRAFT: "#fef9c3",
    ACTIVE: "#dcfce7",
    INACTIVE: "#fee2e2",
    ARCHIVED: "#f3f4f6",
  };
  const statusColor: Record<string, string> = {
    DRAFT: "#854d0e",
    ACTIVE: "#166534",
    INACTIVE: "#991b1b",
    ARCHIVED: "#6b7280",
  };

  function assetStatusLabel(asset: BrandAssetData) {
    if (asset.isApproved) return "Aprovado";
    if (asset.rejectedReason) return "Rejeitado";
    return "Pendente";
  }
  function assetStatusColor(asset: BrandAssetData) {
    if (asset.isApproved) return { bg: "#dcfce7", color: "#166534" };
    if (asset.rejectedReason) return { bg: "#fee2e2", color: "#991b1b" };
    return { bg: "#fef9c3", color: "#854d0e" };
  }

  return (
    <div style={s.container}>
      <button onClick={() => router.push("/dashboard/brands")} style={s.backBtn}>
        ← Voltar para marcas
      </button>

      <div style={s.pageHeader}>
        <div style={s.pageHeaderLeft}>
          <h1 style={s.title}>{brand.name}</h1>
          <code style={s.slug}>/{brand.slug}</code>
          <span style={{
            ...s.badge,
            background: statusBg[brand.status] ?? "#fef9c3",
            color: statusColor[brand.status] ?? "#854d0e",
          }}>
            {statusLabel[brand.status] ?? brand.status}
          </span>
        </div>
        {!isArchived && (
          <div style={s.pageHeaderActions}>
            <button onClick={() => setEditing((e) => !e)} style={s.editBtn}>
              {editing ? "Cancelar" : "Editar"}
            </button>
            <button onClick={handleArchive} disabled={archiving} style={s.archiveBtn}>
              {archiving ? "Arquivando…" : "Arquivar"}
            </button>
          </div>
        )}
      </div>

      {/* Painel de readiness */}
      {readiness && (
        <div style={{
          ...s.card,
          background: readiness.isReadyForWhiteLabel ? "#f0fdf4" : "#fffbeb",
          border: `1px solid ${readiness.isReadyForWhiteLabel ? "#86efac" : "#fde68a"}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <p style={{ margin: "0 0 0.25rem", fontWeight: 700, color: readiness.isReadyForWhiteLabel ? "#166534" : "#92400e" }}>
                {readiness.isReadyForWhiteLabel
                  ? "Marca pronta para white label"
                  : brand.status === "INACTIVE"
                    ? "Marca rejeitada — revise e reenvie"
                    : "Aguardando aprovacao admin"}
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#6b7280" }}>
                {readiness.approvedAssets}/{readiness.totalAssets} assets aprovados
                {readiness.hasApprovedLogo ? " · Logo aprovado" : " · Sem logo aprovado"}
              </p>
            </div>
            {brand.status === "INACTIVE" && brand.rejectedReason && (
              <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "0.5rem 0.75rem", maxWidth: 320 }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#991b1b" }}>
                  <strong>Motivo:</strong> {brand.rejectedReason}
                </p>
              </div>
            )}
          </div>
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
            Produtos do catalogo podem ser vendidos sem marca aprovada (dropshipping padrao).
          </p>
        </div>
      )}

      {editing && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Editar identidade</h2>
          <label style={s.label}>
            Nome
            <input style={s.input} value={editForm.name ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label style={s.label}>
            Descricao
            <textarea style={{ ...s.input, height: 72, resize: "vertical" }} value={editForm.description ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
          </label>
          <label style={s.label}>
            Tom de comunicacao
            <input style={s.input} value={editForm.toneOfVoice ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, toneOfVoice: e.target.value }))} placeholder="sofisticado, casual, minimalista..." />
          </label>
          <div style={s.colorRow}>
            {(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => (
              <label key={key} style={s.colorLabel}>
                {key === "primaryColor" ? "Primaria" : key === "secondaryColor" ? "Secundaria" : "Destaque"}
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  <input type="color" style={s.colorPicker} value={editForm[key] || "#111827"} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} />
                  <input style={{ ...s.input, marginBottom: 0, flex: 1 }} value={editForm[key] ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} placeholder="#111827" />
                </div>
              </label>
            ))}
          </div>
          <label style={s.label}>
            Historia da marca
            <textarea style={{ ...s.input, height: 100, resize: "vertical" }} value={editForm.brandStory ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, brandStory: e.target.value }))} placeholder="Conte a historia da sua marca..." />
          </label>
          <label style={s.label}>
            Diretrizes
            <textarea style={{ ...s.input, height: 100, resize: "vertical" }} value={editForm.guidelines ?? ""} onChange={(e) => setEditForm((f) => ({ ...f, guidelines: e.target.value }))} placeholder="Regras de uso da marca, fontes, etc." />
          </label>
          {saveError && <p style={s.error}>{saveError}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button onClick={() => setEditing(false)} style={s.cancelBtn}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={s.submitBtn}>{saving ? "Salvando…" : "Salvar"}</button>
          </div>
        </div>
      )}

      {!editing && (
        <div style={s.card}>
          <h2 style={s.cardTitle}>Identidade</h2>
          {brand.description && <p style={s.info}>{brand.description}</p>}
          {brand.toneOfVoice && <p style={s.info}><strong>Tom:</strong> {brand.toneOfVoice}</p>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
            {brand.primaryColor && <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ ...s.colorChip, background: brand.primaryColor }} /><span style={s.colorCode}>{brand.primaryColor}</span></div>}
            {brand.secondaryColor && <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ ...s.colorChip, background: brand.secondaryColor }} /><span style={s.colorCode}>{brand.secondaryColor}</span></div>}
            {brand.accentColor && <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span style={{ ...s.colorChip, background: brand.accentColor }} /><span style={s.colorCode}>{brand.accentColor}</span></div>}
          </div>
        </div>
      )}

      <div style={s.card}>
        <h2 style={s.cardTitle}>Assets da marca</h2>

        {assets.length === 0 && <p style={{ color: "#9ca3af", marginBottom: "1rem" }}>Nenhum asset cadastrado.</p>}
        {assets.length > 0 && (
          <div style={s.assetList}>
            {assets.map((asset) => {
              const { bg, color } = assetStatusColor(asset);
              return (
                <div key={asset.id} style={s.assetItem}>
                  <div style={s.assetInfo}>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.2rem" }}>
                      <span style={s.assetType}>{ASSET_TYPE_LABEL[asset.type]}</span>
                      <span style={{ display: "inline-block", background: bg, color, fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: 10, fontWeight: 600 }}>
                        {assetStatusLabel(asset)}
                      </span>
                    </div>
                    <a href={asset.url} target="_blank" rel="noopener noreferrer" style={s.assetUrl}>{asset.filename}</a>
                    {asset.altText && <span style={s.assetAlt}>{asset.altText}</span>}
                    {asset.rejectedReason && (
                      <span style={{ display: "block", fontSize: "0.78rem", color: "#991b1b", marginTop: "0.15rem" }}>
                        Motivo: {asset.rejectedReason}
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleRemoveAsset(asset.id)} style={s.removeBtn}>Remover</button>
                </div>
              );
            })}
          </div>
        )}

        {!isArchived && (
          <form onSubmit={handleAddAsset} style={s.assetForm}>
            <h3 style={{ margin: "1rem 0 0.75rem", fontSize: "0.95rem", fontWeight: 600 }}>Adicionar asset por URL</h3>
            <div style={s.assetFormRow}>
              <label style={s.label}>
                Tipo
                <select style={s.input} value={assetForm.type} onChange={(e) => setAssetForm((f) => ({ ...f, type: e.target.value as AssetType }))}>
                  {(Object.keys(ASSET_TYPE_LABEL) as AssetType[]).map((t) => (
                    <option key={t} value={t}>{ASSET_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </label>
              <label style={{ ...s.label, flex: 2 }}>
                URL publica
                <input style={s.input} value={assetForm.url} onChange={(e) => setAssetForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://exemplo.com/logo.png" />
              </label>
            </div>
            <div style={s.assetFormRow}>
              <label style={s.label}>
                Nome do arquivo
                <input style={s.input} value={assetForm.filename} onChange={(e) => setAssetForm((f) => ({ ...f, filename: e.target.value }))} placeholder="logo.png" />
              </label>
              <label style={s.label}>
                Texto alternativo
                <input style={s.input} value={assetForm.altText ?? ""} onChange={(e) => setAssetForm((f) => ({ ...f, altText: e.target.value }))} placeholder="Descricao acessivel" />
              </label>
            </div>
            {assetError && <p style={s.error}>{assetError}</p>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" disabled={addingAsset} style={s.submitBtn}>{addingAsset ? "Adicionando…" : "Adicionar asset"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function BrandDetailPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: "3rem", fontFamily: "system-ui, sans-serif" }}>Carregando…</p>}>
      <BrandDetailContent />
    </Suspense>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  center: { textAlign: "center", marginTop: "3rem", fontFamily: "system-ui, sans-serif" },
  backBtn: { background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "0.9rem", padding: 0, marginBottom: "1rem", display: "block" },
  pageHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" },
  pageHeaderLeft: { display: "flex", flexDirection: "column", gap: "0.35rem" },
  pageHeaderActions: { display: "flex", gap: "0.5rem" },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 800 },
  slug: { color: "#9ca3af", fontSize: "0.85rem" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, width: "fit-content" },
  editBtn: { padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.875rem" },
  archiveBtn: { padding: "0.5rem 1rem", border: "none", borderRadius: 6, background: "#fee2e2", color: "#991b1b", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem", marginBottom: "1rem" },
  cardTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, borderBottom: "1px solid #f3f4f6", paddingBottom: "0.75rem" },
  label: { display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500, color: "#374151", marginBottom: "0.75rem" },
  input: { border: "1px solid #d1d5db", borderRadius: 6, padding: "0.55rem 0.7rem", fontSize: "0.9rem", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", marginBottom: 0 },
  colorRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" },
  colorLabel: { display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.875rem", fontWeight: 500 },
  colorPicker: { width: 32, height: 32, border: "none", padding: 0, borderRadius: 4, cursor: "pointer", flexShrink: 0 },
  info: { margin: "0 0 0.5rem", color: "#374151", fontSize: "0.9rem", lineHeight: 1.6 },
  colorChip: { display: "inline-block", width: 18, height: 18, borderRadius: 4, border: "1px solid rgba(0,0,0,0.1)" },
  colorCode: { fontSize: "0.8rem", color: "#6b7280", fontFamily: "monospace" },
  assetList: { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" },
  assetItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.75rem", background: "#f9fafb", borderRadius: 6, border: "1px solid #f3f4f6" },
  assetInfo: { display: "flex", flexDirection: "column", gap: "0.1rem" },
  assetType: { fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" },
  assetUrl: { fontSize: "0.875rem", color: "#2563eb", textDecoration: "none", fontWeight: 500 },
  assetAlt: { fontSize: "0.78rem", color: "#9ca3af" },
  removeBtn: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 },
  assetForm: { borderTop: "1px solid #f3f4f6", paddingTop: "0.75rem" },
  assetFormRow: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" },
  error: { color: "#c00", fontSize: "0.875rem", fontWeight: 600, background: "#fee2e2", padding: "0.6rem 0.75rem", borderRadius: 6 },
  cancelBtn: { padding: "0.55rem 1.25rem", border: "1px solid #d1d5db", borderRadius: 6, background: "#fff", cursor: "pointer", fontSize: "0.875rem" },
  submitBtn: { padding: "0.55rem 1.4rem", background: "#111", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" },
};
