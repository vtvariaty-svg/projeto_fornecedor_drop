"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { brandsService, BrandData, BrandStatus } from "../../../../services/brands.service";

const STATUS_LABEL: Record<BrandStatus, string> = {
  DRAFT: "Rascunho",
  ACTIVE: "Ativa",
  INACTIVE: "Inativa",
  ARCHIVED: "Arquivada",
};

const STATUS_COLOR: Record<BrandStatus, string> = {
  DRAFT: "#f59e0b",
  ACTIVE: "#22c55e",
  INACTIVE: "#6b7280",
  ARCHIVED: "#ef4444",
};

function getTenantId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("drop:tenant_id") ?? "";
}

export default function BrandsPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setTenantId(getTenantId());
  }, []);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await brandsService.list(tenantId);
      setBrands(res.items);
      setTotal(res.total);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Brand Studio</h1>
          <p style={s.subtitle}>Gerencie as marcas do seu tenant</p>
        </div>
        <div style={s.headerActions}>
          <button onClick={() => router.push("/dashboard")} style={s.backBtn}>
            ← Dashboard
          </button>
          <Link href="/dashboard/brands/new" style={s.newBtn}>
            + Criar marca
          </Link>
        </div>
      </div>

      {loading && <p style={s.muted}>Carregando marcas…</p>}
      {error && <p style={{ ...s.muted, color: "#c00" }}>{error}</p>}

      {!loading && !error && brands.length === 0 && (
        <div style={s.empty}>
          <p style={s.emptyText}>Nenhuma marca cadastrada ainda.</p>
          <Link href="/dashboard/brands/new" style={s.newBtn}>
            Criar primeira marca
          </Link>
        </div>
      )}

      {!loading && brands.length > 0 && (
        <>
          <p style={s.muted}>{total} marca{total !== 1 ? "s" : ""}</p>
          <div style={s.grid}>
            {brands.map((brand) => (
              <div
                key={brand.id}
                style={s.card}
                onClick={() => router.push(`/dashboard/brands/detail?id=${brand.id}`)}
              >
                <div style={s.cardHeader}>
                  {brand.primaryColor && (
                    <div
                      style={{
                        ...s.colorDot,
                        background: brand.primaryColor,
                        boxShadow: `0 0 0 2px ${brand.primaryColor}44`,
                      }}
                    />
                  )}
                  <span
                    style={{
                      ...s.badge,
                      background: STATUS_COLOR[brand.status] + "22",
                      color: STATUS_COLOR[brand.status],
                      border: `1px solid ${STATUS_COLOR[brand.status]}44`,
                    }}
                  >
                    {STATUS_LABEL[brand.status]}
                  </span>
                </div>
                <h2 style={s.cardName}>{brand.name}</h2>
                <p style={s.cardSlug}>/{brand.slug}</p>
                {brand.description && <p style={s.cardDesc}>{brand.description}</p>}
                <div style={s.cardColors}>
                  {brand.primaryColor && (
                    <span style={{ ...s.colorChip, background: brand.primaryColor }} title="Cor primaria" />
                  )}
                  {brand.secondaryColor && (
                    <span style={{ ...s.colorChip, background: brand.secondaryColor }} title="Cor secundaria" />
                  )}
                  {brand.accentColor && (
                    <span style={{ ...s.colorChip, background: brand.accentColor }} title="Cor de destaque" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" },
  headerActions: { display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" },
  title: { margin: "0 0 0.25rem", fontSize: "1.75rem", fontWeight: 800 },
  subtitle: { margin: 0, color: "#666", fontSize: "0.95rem" },
  backBtn: { background: "none", border: "1px solid #ddd", borderRadius: 6, padding: "0.5rem 1rem", cursor: "pointer", fontSize: "0.9rem", color: "#555" },
  newBtn: { background: "#111", color: "#fff", padding: "0.5rem 1.25rem", borderRadius: 8, textDecoration: "none", fontSize: "0.9rem", fontWeight: 600, display: "inline-block" },
  muted: { color: "#888", textAlign: "center", marginTop: "1.5rem" },
  empty: { textAlign: "center", padding: "4rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" },
  emptyText: { color: "#888", fontSize: "1.1rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.5rem", cursor: "pointer", transition: "box-shadow 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600 },
  colorDot: { width: 16, height: 16, borderRadius: "50%" },
  cardName: { margin: "0 0 0.2rem", fontSize: "1.15rem", fontWeight: 700 },
  cardSlug: { margin: "0 0 0.5rem", color: "#9ca3af", fontSize: "0.8rem", fontFamily: "monospace" },
  cardDesc: { margin: "0 0 0.75rem", color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  cardColors: { display: "flex", gap: "0.4rem", marginTop: "0.5rem" },
  colorChip: { display: "inline-block", width: 20, height: 20, borderRadius: 4, border: "1px solid rgba(0,0,0,0.1)" },
};
