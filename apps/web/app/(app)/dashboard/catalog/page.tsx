"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  catalogService,
  ProductData,
  ProductCustomizationOptionData,
  CatalogListResponse,
} from "../../../../services/catalog.service";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getTenantId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("drop:tenant_id") ?? "";
}

// ─── Product Detail ───────────────────────────────────────────────────────────

function ProductDetail({
  slug,
  tenantId,
  onBack,
}: {
  slug: string;
  tenantId: string;
  onBack: () => void;
}) {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [customizations, setCustomizations] = useState<ProductCustomizationOptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      catalogService.getBySlug(slug, tenantId),
      catalogService.getCustomizationOptions(slug, tenantId).catch(() => []),
    ])
      .then(([prod, opts]) => {
        setProduct(prod);
        setCustomizations(opts);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug, tenantId]);

  if (loading) return <p style={s.muted}>Carregando produto...</p>;
  if (error) return <p style={s.error}>{error}</p>;
  if (!product) return null;

  const activeVariants = product.variants.filter((v) => v.status === "ACTIVE");
  const availableVariants = activeVariants.filter((v) => v.isAvailable);

  return (
    <div>
      <button onClick={onBack} style={s.backBtn}>
        ← Voltar ao catálogo
      </button>

      <div style={s.dropshippingNotice}>
        Produtos do catálogo podem ser vendidos via dropshipping sem marca própria.
      </div>

      <div style={s.card}>
        {product.media.length > 0 && (
          <div style={s.mediaRow}>
            {product.media.slice(0, 3).map((m) => (
              <img
                key={m.id}
                src={m.url}
                alt={m.altText ?? product.name}
                style={s.thumb}
              />
            ))}
          </div>
        )}

        <h2 style={s.productTitle}>{product.name}</h2>
        {product.category && (
          <span style={s.badge}>{product.category}</span>
        )}
        <p style={s.price}>{formatPrice(Number(product.basePrice))}</p>
        {product.description && (
          <p style={s.desc}>{product.description}</p>
        )}

        <div style={{ marginBottom: "1rem" }}>
          {availableVariants.length > 0 ? (
            <span style={s.badgeAvailable}>✓ {availableVariants.length} variante{availableVariants.length !== 1 ? "s" : ""} disponível{availableVariants.length !== 1 ? "is" : ""}</span>
          ) : (
            <span style={s.badgeUnavailable}>Sem estoque disponível</span>
          )}
        </div>

        <h3 style={s.variantTitle}>Variantes</h3>
        {activeVariants.length === 0 ? (
          <p style={s.muted}>Nenhuma variante disponível.</p>
        ) : (
          <div style={s.variantGrid}>
            {activeVariants.map((v) => (
              <div key={v.id} style={{ ...s.variantCard, opacity: v.isAvailable ? 1 : 0.55 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{v.name}</p>
                  <span style={v.isAvailable ? s.badgeAvailable : s.badgeUnavailable}>
                    {v.isAvailable ? "Disponível" : "Indisponível"}
                  </span>
                </div>
                <p style={s.variantSku}>SKU: {v.sku}</p>
                {v.color && <p style={s.variantAttr}>Cor: {v.color}</p>}
                {v.size && <p style={s.variantAttr}>Tamanho: {v.size}</p>}
                {v.material && <p style={s.variantAttr}>Material: {v.material}</p>}
                <p style={s.variantPrice}>{formatPrice(Number(v.salePrice))}</p>
              </div>
            ))}
          </div>
        )}

        {customizations.length > 0 && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3 style={s.variantTitle}>Opções de personalização disponíveis</h3>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", marginBottom: "0.75rem" }}>
              Disponível para marcas aprovadas (white label opcional).
            </p>
            <div style={s.variantGrid}>
              {customizations.map((link) => (
                <div key={link.id} style={s.variantCard}>
                  <p style={{ margin: "0 0 0.25rem", fontWeight: 600, fontSize: "0.9rem" }}>
                    {link.customizationOption.name}
                  </p>
                  {link.customizationOption.type && (
                    <span style={s.badge}>{link.customizationOption.type}</span>
                  )}
                  {link.customizationOption.description && (
                    <p style={{ ...s.variantAttr, marginTop: "0.3rem" }}>{link.customizationOption.description}</p>
                  )}
                  {link.additionalPrice != null && Number(link.additionalPrice) > 0 && (
                    <p style={{ ...s.variantPrice, marginTop: "0.4rem" }}>
                      + {formatPrice(Number(link.additionalPrice))}
                    </p>
                  )}
                  {link.isRequired && (
                    <span style={{ ...s.badge, background: "#fef3c7", color: "#92400e" }}>Obrigatória</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Catalog List ─────────────────────────────────────────────────────────────

function CatalogInner() {
  const router = useRouter();
  const params = useSearchParams();
  const selectedSlug = params.get("produto");

  const [catalog, setCatalog] = useState<CatalogListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => {
    const tid = getTenantId();
    setTenantId(tid);
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    catalogService
      .list(tenantId, { search: search || undefined })
      .then(setCatalog)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId, search]);

  function selectProduct(slug: string) {
    router.push(`/dashboard/catalog?produto=${slug}`);
  }

  function goBack() {
    router.push("/dashboard/catalog");
  }

  if (selectedSlug && tenantId) {
    return <ProductDetail slug={selectedSlug} tenantId={tenantId} onBack={goBack} />;
  }

  return (
    <div>
      <header style={s.header}>
        <h1 style={s.title}>Catálogo</h1>
        <button onClick={() => router.push("/dashboard")} style={s.backBtn}>
          ← Dashboard
        </button>
      </header>

      <div style={s.dropshippingNotice}>
        Todos os produtos podem ser vendidos via dropshipping sem marca própria. Brand Studio é opcional.
      </div>

      <input
        type="search"
        placeholder="Buscar produto..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={s.searchInput}
      />

      {loading && <p style={s.muted}>Carregando catálogo...</p>}
      {error && <p style={s.error}>{error}</p>}
      {!loading && !error && catalog?.items.length === 0 && (
        <p style={s.muted}>Nenhum produto encontrado.</p>
      )}

      <div style={s.grid}>
        {catalog?.items.map((p) => {
          const availableCount = p.variants.filter((v) => v.isAvailable).length;
          const hasCustomization = (p as ProductData & { hasCustomization?: boolean }).hasCustomization;
          return (
            <div
              key={p.id}
              style={s.productCard}
              onClick={() => selectProduct(p.slug)}
            >
              {p.media[0] ? (
                <img
                  src={p.media[0].url}
                  alt={p.media[0].altText ?? p.name}
                  style={s.cardImage}
                />
              ) : (
                <div style={s.cardImagePlaceholder}>Sem imagem</div>
              )}
              <div style={s.cardBody}>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  {p.category && <span style={s.badge}>{p.category}</span>}
                  {hasCustomization && (
                    <span style={s.badgeCustomization}>Personalização</span>
                  )}
                </div>
                <p style={s.cardName}>{p.name}</p>
                <p style={s.cardPrice}>{formatPrice(Number(p.basePrice))}</p>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                  <span style={s.cardVariants}>
                    {p.variants.length} variante{p.variants.length !== 1 ? "s" : ""}
                  </span>
                  {availableCount > 0 ? (
                    <span style={s.badgeAvailableSm}>✓ {availableCount} disp.</span>
                  ) : (
                    <span style={s.badgeUnavailableSm}>Sem estoque</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {catalog && catalog.pages > 1 && (
        <p style={s.muted}>
          Página {catalog.page} de {catalog.pages} — {catalog.total} produtos
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  return (
    <main style={s.main}>
      <div style={s.container}>
        <Suspense fallback={<p style={s.muted}>Carregando...</p>}>
          <CatalogInner />
        </Suspense>
      </div>
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  main: { minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui, sans-serif" },
  container: { maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  title: { margin: 0, fontSize: "1.5rem" },
  backBtn: { padding: "0.5rem 1rem", background: "transparent", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", fontSize: "0.875rem" },
  dropshippingNotice: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", padding: "0.6rem 1rem", marginBottom: "1.25rem", color: "#1e40af", fontSize: "0.875rem" },
  searchInput: { width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd", borderRadius: "6px", fontSize: "1rem", marginBottom: "1.5rem", boxSizing: "border-box" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" },
  productCard: { background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" },
  cardImage: { width: "100%", height: "180px", objectFit: "cover", display: "block" },
  cardImagePlaceholder: { width: "100%", height: "180px", background: "#eee", display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: "0.875rem" },
  cardBody: { padding: "0.75rem" },
  cardName: { margin: "0.25rem 0 0.25rem", fontWeight: 600, fontSize: "0.95rem" },
  cardPrice: { margin: "0 0 0.25rem", color: "#111", fontWeight: 700 },
  cardVariants: { margin: 0, color: "#888", fontSize: "0.75rem" },
  badge: { display: "inline-block", background: "#f0f0f0", color: "#555", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "12px" },
  badgeCustomization: { display: "inline-block", background: "#ede9fe", color: "#5b21b6", fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "12px", fontWeight: 600 },
  badgeAvailable: { display: "inline-block", background: "#dcfce7", color: "#166534", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "12px", fontWeight: 600 },
  badgeUnavailable: { display: "inline-block", background: "#f3f4f6", color: "#6b7280", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "12px" },
  badgeAvailableSm: { display: "inline-block", background: "#dcfce7", color: "#166534", fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "10px", fontWeight: 600 },
  badgeUnavailableSm: { display: "inline-block", background: "#f3f4f6", color: "#6b7280", fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "10px" },
  muted: { color: "#888", textAlign: "center", marginTop: "2rem" },
  error: { color: "#c00", textAlign: "center", marginTop: "2rem" },
  card: { background: "#fff", borderRadius: "8px", padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  mediaRow: { display: "flex", gap: "0.75rem", marginBottom: "1rem", overflowX: "auto" },
  thumb: { width: "160px", height: "160px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 },
  productTitle: { margin: "0 0 0.5rem", fontSize: "1.4rem" },
  price: { fontSize: "1.25rem", fontWeight: 700, color: "#111", margin: "0.5rem 0" },
  desc: { color: "#555", lineHeight: 1.6, marginBottom: "1.5rem" },
  variantTitle: { fontSize: "1rem", margin: "1.5rem 0 0.75rem" },
  variantGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" },
  variantCard: { border: "1px solid #e5e5e5", borderRadius: "6px", padding: "0.75rem" },
  variantSku: { margin: "0.2rem 0", color: "#888", fontSize: "0.8rem" },
  variantAttr: { margin: "0.15rem 0", color: "#555", fontSize: "0.85rem" },
  variantPrice: { fontWeight: 700, margin: "0.5rem 0 0", color: "#111" },
};
