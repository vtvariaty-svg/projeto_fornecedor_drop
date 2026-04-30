"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  publicCatalogService,
  PublicProduct,
  PublicProductListResponse,
} from "../../services/public-catalog.service";
import { APP_NAME } from "../../lib/config";

export default function CatalogoPage() {
  return (
    <Suspense fallback={<p style={s.loading}>Carregando catálogo...</p>}>
      <CatalogoContent />
    </Suspense>
  );
}

function CatalogoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slugParam = searchParams.get("produto");

  const [listData, setListData] = useState<PublicProductListResponse | null>(null);
  const [detail, setDetail] = useState<PublicProduct | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slugParam) {
      setLoading(true);
      publicCatalogService
        .getBySlug(slugParam)
        .then((p) => {
          setDetail(p);
          setListData(null);
        })
        .catch(() => setError("Produto não encontrado."))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
      setLoading(true);
      publicCatalogService
        .list({ page, search: search || undefined, limit: 24 })
        .then(setListData)
        .catch(() => setError("Erro ao carregar catálogo."))
        .finally(() => setLoading(false));
    }
  }, [slugParam, page, search]);

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
  }

  function formatPrice(price?: number | null) {
    if (price == null) return null;
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function coverUrl(product: PublicProduct) {
    const cover = product.media.find((m) => !m.variantId) ?? product.media[0];
    return cover?.url ?? null;
  }

  function isProductAvailable(product: PublicProduct) {
    return product.variants.some((v) => v.isAvailable);
  }

  function displayPrice(product: PublicProduct) {
    const prices = product.variants.map((v) => v.salePrice).filter((p): p is number => p != null);
    if (prices.length === 0) return formatPrice(product.basePrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return formatPrice(min);
    return `${formatPrice(min)} — ${formatPrice(max)}`;
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <Link href="/" style={s.logo}>
          {APP_NAME}
        </Link>
        <nav style={s.nav}>
          <Link href="/catalogo" style={s.navLinkActive}>
            Catálogo
          </Link>
          <Link href="/login" style={s.navLink}>
            Entrar
          </Link>
          <Link href="/login" style={s.navBtnPrimary}>
            Criar conta
          </Link>
        </nav>
      </header>

      <main style={s.main}>
        {/* Breadcrumb */}
        <div style={s.breadcrumb}>
          <Link href="/" style={s.breadcrumbLink}>
            Início
          </Link>
          {" › "}
          <span>Catálogo</span>
          {detail && (
            <>
              {" › "}
              <button
                onClick={() => router.push("/catalogo")}
                style={s.breadcrumbBtn}
              >
                Todos os produtos
              </button>
              {" › "}
              <span>{detail.name}</span>
            </>
          )}
        </div>

        {/* Detail view */}
        {slugParam && (
          <>
            {loading && <p style={s.loading}>Carregando produto...</p>}
            {error && <p style={s.errorMsg}>{error}</p>}
            {detail && !loading && (
              <div style={s.detailWrap}>
                <button
                  onClick={() => router.push("/catalogo")}
                  style={s.backBtn}
                >
                  ← Voltar ao catálogo
                </button>
                <div style={s.detailGrid}>
                  <div style={s.detailMedia}>
                    {coverUrl(detail) ? (
                      <img
                        src={coverUrl(detail)!}
                        alt={detail.name}
                        style={s.detailImg}
                      />
                    ) : (
                      <div style={s.noImg}>Sem imagem</div>
                    )}
                    {detail.media.length > 1 && (
                      <div style={s.thumbRow}>
                        {detail.media.slice(0, 5).map((m) => (
                          <img
                            key={m.id}
                            src={m.url}
                            alt={m.altText ?? ""}
                            style={s.thumb}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={s.detailInfo}>
                    {detail.category && (
                      <span style={s.categoryBadge}>{detail.category}</span>
                    )}
                    <h1 style={s.detailTitle}>{detail.name}</h1>
                    <div style={s.badgeRow}>
                      <span style={s.dropBadge}>Produto para dropshipping</span>
                      {detail.hasCustomization && (
                        <span style={s.custBadge}>Personalização disponível</span>
                      )}
                    </div>
                    <p style={s.detailPrice}>{displayPrice(detail)}</p>
                    {detail.description && (
                      <p style={s.detailDesc}>{detail.description}</p>
                    )}

                    <div style={s.variantsSection}>
                      <h3 style={s.variantsTitle}>Variantes disponíveis</h3>
                      <div style={s.variantsList}>
                        {detail.variants.map((v) => (
                          <div key={v.id} style={{ ...s.variantItem, opacity: v.isAvailable ? 1 : 0.45 }}>
                            <div style={s.variantName}>{v.name || v.sku}</div>
                            {v.color && <div style={s.variantAttr}>Cor: {v.color}</div>}
                            {v.size && <div style={s.variantAttr}>Tamanho: {v.size}</div>}
                            {v.material && <div style={s.variantAttr}>Material: {v.material}</div>}
                            {v.salePrice != null && (
                              <div style={s.variantPrice}>{formatPrice(v.salePrice)}</div>
                            )}
                            <div style={{ ...s.availBadge, background: v.isAvailable ? "#dcfce7" : "#f3f4f6", color: v.isAvailable ? "#166534" : "#6b7280" }}>
                              {v.isAvailable ? "Disponível" : "Indisponível"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Blocked CTA */}
                    <div style={s.lockedBox}>
                      <p style={s.lockedMsg}>
                        Entre para criar pedidos ou conectar produtos à sua loja.
                      </p>
                      <Link href="/login" style={s.loginBtn}>
                        Entrar para criar pedido
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* List view */}
        {!slugParam && (
          <>
            <div style={s.listHeader}>
              <h1 style={s.listTitle}>Catálogo de produtos</h1>
              <p style={s.listSubtitle}>
                Produtos prontos para revenda por dropshipping. Sem estoque próprio, sem fábrica, sem logística.
              </p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} style={s.searchForm}>
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={s.searchInput}
              />
              <button type="submit" style={s.searchBtn}>
                Buscar
              </button>
            </form>

            {loading && <p style={s.loading}>Carregando produtos...</p>}
            {error && <p style={s.errorMsg}>{error}</p>}

            {listData && !loading && (
              <>
                <p style={s.totalText}>
                  {listData.total} produto{listData.total !== 1 ? "s" : ""} encontrado{listData.total !== 1 ? "s" : ""}
                </p>

                {listData.items.length === 0 && (
                  <p style={s.emptyMsg}>Nenhum produto encontrado.</p>
                )}

                <div style={s.grid}>
                  {listData.items.map((product) => (
                    <div key={product.id} style={s.card}>
                      <div style={s.cardImgWrap}>
                        {coverUrl(product) ? (
                          <img
                            src={coverUrl(product)!}
                            alt={product.name}
                            style={s.cardImg}
                          />
                        ) : (
                          <div style={s.cardNoImg}>Sem imagem</div>
                        )}
                        {isProductAvailable(product) ? (
                          <span style={s.availTag}>Disponível</span>
                        ) : (
                          <span style={{ ...s.availTag, background: "#f3f4f6", color: "#6b7280" }}>Indisponível</span>
                        )}
                      </div>
                      <div style={s.cardBody}>
                        {product.category && (
                          <span style={s.cardCategory}>{product.category}</span>
                        )}
                        <h3 style={s.cardName}>{product.name}</h3>
                        <div style={s.cardBadges}>
                          <span style={s.dropBadgeSm}>Dropshipping</span>
                          {product.hasCustomization && (
                            <span style={s.custBadgeSm}>Personalização</span>
                          )}
                        </div>
                        <p style={s.cardPrice}>{displayPrice(product)}</p>
                        <div style={s.cardActions}>
                          <Link
                            href={`/catalogo?produto=${product.slug}`}
                            style={s.detailBtn}
                          >
                            Ver detalhes
                          </Link>
                          <Link href="/login" style={s.orderBtnLocked}>
                            Entrar para criar pedido
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {listData.pages > 1 && (
                  <div style={s.pagination}>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      style={{ ...s.pageBtn, opacity: page === 1 ? 0.4 : 1 }}
                    >
                      Anterior
                    </button>
                    <span style={s.pageInfo}>
                      {page} / {listData.pages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(listData.pages, p + 1))}
                      disabled={page === listData.pages}
                      style={{ ...s.pageBtn, opacity: page === listData.pages ? 0.4 : 1 }}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Bottom CTA */}
            <div style={s.bottomCta}>
              <p style={s.ctaText}>Pronto para vender sem estoque?</p>
              <Link href="/login" style={s.ctaBtn}>
                Quero vender por dropshipping
              </Link>
            </div>
          </>
        )}
      </main>

      <footer style={s.footer}>
        <p style={s.footerText}>
          Catálogo público — para criar pedidos,{" "}
          <Link href="/login" style={s.footerLink}>
            entre na plataforma
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f9fafb",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#111827",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontWeight: 800,
    fontSize: "1.1rem",
    textDecoration: "none",
    color: "#111827",
  },
  nav: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  navLink: {
    textDecoration: "none",
    color: "#4b5563",
    fontWeight: 500,
    fontSize: "0.9rem",
  },
  navLinkActive: {
    textDecoration: "none",
    color: "#111827",
    fontWeight: 700,
    fontSize: "0.9rem",
    borderBottom: "2px solid #111827",
    paddingBottom: "2px",
  },
  navBtnPrimary: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.875rem",
  },
  main: {
    flex: 1,
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "2rem 1.5rem",
    width: "100%",
  },
  breadcrumb: {
    fontSize: "0.85rem",
    color: "#6b7280",
    marginBottom: "1.5rem",
  },
  breadcrumbLink: {
    color: "#6b7280",
    textDecoration: "none",
  },
  breadcrumbBtn: {
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    padding: 0,
    fontSize: "0.85rem",
    textDecoration: "underline",
  },
  loading: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: "3rem",
    fontSize: "1rem",
  },
  errorMsg: {
    textAlign: "center",
    color: "#dc2626",
    marginTop: "2rem",
  },
  listHeader: {
    marginBottom: "1.5rem",
  },
  listTitle: {
    fontSize: "1.75rem",
    fontWeight: 800,
    margin: "0 0 0.5rem",
    letterSpacing: "-0.03em",
  },
  listSubtitle: {
    color: "#6b7280",
    fontSize: "1rem",
    margin: 0,
  },
  searchForm: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    maxWidth: "480px",
  },
  searchInput: {
    flex: 1,
    padding: "0.6rem 1rem",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "0.95rem",
    outline: "none",
  },
  searchBtn: {
    padding: "0.6rem 1.25rem",
    backgroundColor: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  totalText: {
    color: "#6b7280",
    fontSize: "0.875rem",
    marginBottom: "1rem",
  },
  emptyMsg: {
    color: "#6b7280",
    textAlign: "center",
    marginTop: "3rem",
    fontSize: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "1.25rem",
    marginBottom: "2rem",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
    transition: "box-shadow 0.2s",
  },
  cardImgWrap: {
    position: "relative",
    height: "200px",
    backgroundColor: "#f3f4f6",
  },
  cardImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardNoImg: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9ca3af",
    fontSize: "0.875rem",
  },
  availTag: {
    position: "absolute",
    top: "0.5rem",
    right: "0.5rem",
    backgroundColor: "#dcfce7",
    color: "#166534",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.2rem 0.5rem",
    borderRadius: "999px",
  },
  cardBody: {
    padding: "1rem",
  },
  cardCategory: {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    display: "block",
    marginBottom: "0.35rem",
  },
  cardName: {
    fontSize: "1rem",
    fontWeight: 700,
    margin: "0 0 0.5rem",
    color: "#111827",
  },
  cardBadges: {
    display: "flex",
    gap: "0.35rem",
    flexWrap: "wrap",
    marginBottom: "0.6rem",
  },
  dropBadgeSm: {
    fontSize: "0.65rem",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "0.15rem 0.4rem",
    borderRadius: "4px",
    fontWeight: 600,
  },
  custBadgeSm: {
    fontSize: "0.65rem",
    backgroundColor: "#faf5ff",
    color: "#7c3aed",
    padding: "0.15rem 0.4rem",
    borderRadius: "4px",
    fontWeight: 600,
  },
  cardPrice: {
    fontWeight: 800,
    fontSize: "1.1rem",
    color: "#111827",
    margin: "0 0 0.75rem",
  },
  cardActions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  detailBtn: {
    textDecoration: "none",
    textAlign: "center",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.5rem",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.875rem",
  },
  orderBtnLocked: {
    textDecoration: "none",
    textAlign: "center",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    padding: "0.5rem",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.8rem",
    border: "1px solid #e5e7eb",
  },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    marginTop: "2rem",
    marginBottom: "1rem",
  },
  pageBtn: {
    padding: "0.5rem 1.25rem",
    backgroundColor: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  pageInfo: {
    color: "#6b7280",
    fontSize: "0.875rem",
  },
  bottomCta: {
    textAlign: "center",
    padding: "3rem 1rem",
    borderTop: "1px solid #e5e7eb",
    marginTop: "2rem",
  },
  ctaText: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#111827",
    marginBottom: "1rem",
  },
  ctaBtn: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "1rem",
    display: "inline-block",
  },
  // Detail view
  detailWrap: {
    maxWidth: "1024px",
    margin: "0 auto",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#6b7280",
    cursor: "pointer",
    fontSize: "0.9rem",
    padding: "0 0 1rem",
    display: "block",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "2.5rem",
  },
  detailMedia: {},
  detailImg: {
    width: "100%",
    borderRadius: "12px",
    objectFit: "cover",
    maxHeight: "440px",
  },
  noImg: {
    width: "100%",
    height: "300px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    color: "#9ca3af",
    borderRadius: "12px",
  },
  thumbRow: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.75rem",
    overflowX: "auto",
  },
  thumb: {
    width: "72px",
    height: "72px",
    objectFit: "cover",
    borderRadius: "6px",
    border: "2px solid #e5e7eb",
    cursor: "pointer",
    flexShrink: 0,
  },
  detailInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  categoryBadge: {
    fontSize: "0.75rem",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  detailTitle: {
    fontSize: "1.75rem",
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.03em",
    lineHeight: 1.2,
  },
  badgeRow: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  dropBadge: {
    fontSize: "0.75rem",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    padding: "0.25rem 0.6rem",
    borderRadius: "6px",
    fontWeight: 700,
  },
  custBadge: {
    fontSize: "0.75rem",
    backgroundColor: "#faf5ff",
    color: "#7c3aed",
    padding: "0.25rem 0.6rem",
    borderRadius: "6px",
    fontWeight: 700,
  },
  detailPrice: {
    fontSize: "1.5rem",
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },
  detailDesc: {
    color: "#4b5563",
    lineHeight: 1.6,
    fontSize: "0.95rem",
    margin: 0,
  },
  variantsSection: {},
  variantsTitle: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#374151",
    marginBottom: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  variantsList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  variantItem: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "0.6rem 0.875rem",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem 1rem",
    alignItems: "center",
  },
  variantName: {
    fontWeight: 700,
    fontSize: "0.875rem",
    color: "#111827",
  },
  variantAttr: {
    fontSize: "0.8rem",
    color: "#6b7280",
  },
  variantPrice: {
    fontSize: "0.875rem",
    fontWeight: 700,
    color: "#111827",
    marginLeft: "auto",
  },
  availBadge: {
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.2rem 0.5rem",
    borderRadius: "4px",
  },
  lockedBox: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "1.25rem",
    textAlign: "center",
    marginTop: "0.5rem",
  },
  lockedMsg: {
    color: "#6b7280",
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
  },
  loginBtn: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.65rem 1.5rem",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "0.95rem",
    display: "inline-block",
  },
  footer: {
    textAlign: "center",
    padding: "1.5rem 1rem",
    borderTop: "1px solid #e5e7eb",
    backgroundColor: "#fff",
  },
  footerText: {
    color: "#9ca3af",
    fontSize: "0.875rem",
    margin: 0,
  },
  footerLink: {
    color: "#4b5563",
    fontWeight: 600,
  },
};
