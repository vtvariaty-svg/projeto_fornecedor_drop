"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService, UserData, TenantData } from "../../../services/auth.service";
import { tenantsService } from "../../../services/tenants.service";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [activeTenant, setActiveTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [bootstrapMsg, setBootstrapMsg] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [tenantOpen, setTenantOpen] = useState(false);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    authService
      .me()
      .then(({ user, tenants }) => {
        setUser(user);
        setTenants(tenants);
        const stored = localStorage.getItem("drop:tenant_id");
        const first = tenants.find((t) => t.id === stored) ?? tenants[0] ?? null;
        setActiveTenant(first);
        if (first) localStorage.setItem("drop:tenant_id", first.id);
      })
      .catch(() => {
        authService.logout().then(() => router.replace("/login"));
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    localStorage.removeItem("drop:tenant_id");
    await authService.logout();
    router.replace("/login");
  }

  function selectTenant(t: TenantData) {
    setActiveTenant(t);
    localStorage.setItem("drop:tenant_id", t.id);
    setTenantOpen(false);
  }

  async function handleBootstrap() {
    setBootstrapping(true);
    setBootstrapError(null);
    setBootstrapMsg(null);
    try {
      const tenant = await tenantsService.bootstrapCurrentUserTenant();
      setTenants([tenant]);
      setActiveTenant(tenant);
      localStorage.setItem("drop:tenant_id", tenant.id);
      setBootstrapMsg(`Tenant "${tenant.name}" criado com sucesso.`);
    } catch (e) {
      setBootstrapError((e as Error).message ?? "Erro ao criar tenant.");
    } finally {
      setBootstrapping(false);
    }
  }

  if (loading) return <p style={st.center}>Carregando...</p>;
  if (!user) return null;

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = isSuperAdmin || user.role === "ADMIN";
  const hasNoTenants = tenants.length === 0;

  return (
    <div style={st.page}>
      {/* Top Bar */}
      <header style={st.topbar}>
        <div style={st.topbarLeft}>
          <Link href="/" style={st.brand}>
            Portal B2B
          </Link>
          <span style={st.topbarSep}>|</span>
          {/* Tenant selector */}
          {tenants.length > 0 && (
            <div style={st.tenantSelector}>
              <button
                onClick={() => setTenantOpen((o) => !o)}
                style={st.tenantBtn}
              >
                <span style={st.tenantDot} />
                {activeTenant?.name ?? "Selecionar empresa"}
                <span style={st.tenantChevron}>{tenantOpen ? "▲" : "▼"}</span>
              </button>
              {tenantOpen && (
                <div style={st.tenantDropdown}>
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTenant(t)}
                      style={{
                        ...st.tenantItem,
                        fontWeight: activeTenant?.id === t.id ? 700 : 400,
                        backgroundColor: activeTenant?.id === t.id ? "#f0fdf4" : "transparent",
                      }}
                    >
                      {t.name}
                      <span style={st.tenantItemRole}>{t.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={st.topbarRight}>
          <span style={st.userLabel}>{user.name}</span>
          <button onClick={handleLogout} style={st.logoutBtn}>
            Sair
          </button>
        </div>
      </header>

      <main style={st.main}>
        <div style={st.container}>
          {/* Welcome */}
          <div style={st.welcome}>
            <h1 style={st.welcomeTitle}>
              Olá, {user.name.split(" ")[0]}
            </h1>
            <p style={st.welcomeSub}>
              {activeTenant
                ? `Operando como ${activeTenant.name} · ${activeTenant.role}`
                : "Nenhuma empresa ativa"}
            </p>
          </div>

          {/* No tenant — SUPER_ADMIN bootstrap */}
          {hasNoTenants && isSuperAdmin && (
            <div style={{ ...st.alertCard, borderColor: "#f59e0b" }}>
              <h2 style={{ ...st.alertTitle, color: "#92400e" }}>Configuração inicial necessária</h2>
              <p style={st.alertText}>
                Nenhuma empresa vinculada ao seu perfil. Crie um tenant inicial para começar a operar.
              </p>
              {bootstrapMsg && <p style={st.successMsg}>{bootstrapMsg}</p>}
              {bootstrapError && <p style={st.errorMsg}>{bootstrapError}</p>}
              <button onClick={handleBootstrap} disabled={bootstrapping} style={st.bootstrapBtn}>
                {bootstrapping ? "Criando..." : "Criar / vincular tenant inicial"}
              </button>
            </div>
          )}

          {/* No tenant — common user */}
          {hasNoTenants && !isSuperAdmin && (
            <div style={{ ...st.alertCard, borderColor: "#d1d5db" }}>
              <h2 style={st.alertTitle}>Conta sem acesso operacional</h2>
              <p style={st.alertText}>
                Sua conta ainda não está vinculada a nenhuma empresa. Solicite acesso ao administrador da plataforma.
              </p>
            </div>
          )}

          {/* Modules */}
          {!hasNoTenants && activeTenant && (
            <>
              {/* Vendas */}
              <ModuleSection title="Vendas">
                <ModuleCardItem
                  icon="🛍"
                  title="Catálogo operacional"
                  desc="Consulte produtos disponíveis para revenda com preços de fornecedor."
                  href="/dashboard/catalog"
                  color="#eff6ff"
                />
                <ModuleCardItem
                  icon="✏️"
                  title="Novo pedido"
                  desc="Crie um pedido de dropshipping padrão ou white label."
                  href="/dashboard/orders/new"
                  color="#f0fdf4"
                />
                <ModuleCardItem
                  icon="📦"
                  title="Meus pedidos"
                  desc="Acompanhe seus pedidos, status e histórico de compras."
                  href="/dashboard/orders"
                  color="#fff7ed"
                />
              </ModuleSection>

              {/* Marca própria */}
              <ModuleSection title="Marca própria">
                <ModuleCardItem
                  icon="🏷"
                  title="Brand Studio"
                  desc="Gerencie suas marcas e ativos aprovados para white label."
                  href="/dashboard/brands"
                  color="#faf5ff"
                />
                <ModuleCardItem
                  icon="🎨"
                  title="White label"
                  desc="Personalize produtos com sua identidade visual."
                  href="/dashboard/brands"
                  color="#fdf4ff"
                  soon
                  locked
                />
              </ModuleSection>

              {/* Integrações */}
              <ModuleSection title="Integrações">
                <ModuleCardItem
                  icon="🔗"
                  title="Shopify"
                  desc="Sincronize produtos e pedidos com sua loja Shopify."
                  locked
                  soon
                  color="#f9fafb"
                />
                <ModuleCardItem
                  icon="🔗"
                  title="Nuvemshop"
                  desc="Integração direta com plataforma Nuvemshop."
                  locked
                  soon
                  color="#f9fafb"
                />
                <ModuleCardItem
                  icon="🔗"
                  title="WooCommerce"
                  desc="Conecte sua loja WordPress/WooCommerce."
                  locked
                  soon
                  color="#f9fafb"
                />
                <ModuleCardItem
                  icon="⚙️"
                  title="API"
                  desc="Acesse via API REST para integrações personalizadas."
                  locked
                  soon
                  color="#f9fafb"
                />
              </ModuleSection>
            </>
          )}

          {/* Administração (admin only) */}
          {isAdmin && !hasNoTenants && (
            <ModuleSection title="Administração">
              <ModuleCardItem
                icon="📋"
                title="Produtos"
                desc="Gerencie o catálogo completo de produtos, SKUs e mídia."
                href="/dashboard/admin/products"
                color="#fef3c7"
              />
              <ModuleCardItem
                icon="📦"
                title="Estoque"
                desc="Consulte e ajuste o estoque por SKU. Veja movimentações."
                href="/dashboard/admin/inventory"
                color="#fef3c7"
              />
              <ModuleCardItem
                icon="🏢"
                title="Tenants"
                desc="Gerencie empresas, usuários e permissões da plataforma."
                href="/dashboard/catalog"
                color="#fef3c7"
                soon
              />
            </ModuleSection>
          )}

          {/* Catalog link when no tenant */}
          {hasNoTenants && (
            <div style={st.publicCatalogBanner}>
              <p style={st.bannerText}>
                Enquanto isso, você pode consultar o catálogo público de produtos.
              </p>
              <Link href="/catalogo" style={st.bannerBtn}>
                Ver catálogo público
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ModuleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={st.moduleSection}>
      <h2 style={st.sectionTitle}>{title}</h2>
      <div style={st.moduleGrid}>{children}</div>
    </div>
  );
}

function ModuleCardItem({
  icon,
  title,
  desc,
  href,
  locked,
  soon,
  color,
}: {
  icon: string;
  title: string;
  desc: string;
  href?: string;
  locked?: boolean;
  soon?: boolean;
  color?: string;
  action?: () => void;
  adminOnly?: boolean;
}) {
  const cardStyle: React.CSSProperties = {
    ...st.moduleCard,
    backgroundColor: color ?? "#fff",
    opacity: locked && !soon ? 0.6 : 1,
    cursor: locked ? "default" : "pointer",
  };

  const inner = (
    <div style={cardStyle}>
      <div style={st.cardIconWrap}>
        <span style={st.cardIcon}>{icon}</span>
      </div>
      <div style={st.cardBody}>
        <h3 style={st.cardTitle}>
          {title}
          {soon && <span style={st.soonTag}>Em breve</span>}
        </h3>
        <p style={st.cardDesc}>{desc}</p>
        {locked && (
          <p style={st.lockedHint}>
            Entre para criar pedidos ou conectar produtos à sua loja.
          </p>
        )}
      </div>
    </div>
  );

  if (href && !locked) {
    return (
      <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
        {inner}
      </Link>
    );
  }
  return inner;
}

const st: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#111827",
    display: "flex",
    flexDirection: "column",
  },
  center: {
    textAlign: "center",
    marginTop: "4rem",
    color: "#6b7280",
  },
  topbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 20,
    gap: "1rem",
  },
  topbarLeft: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  brand: {
    fontWeight: 800,
    fontSize: "1rem",
    color: "#111827",
    textDecoration: "none",
    letterSpacing: "-0.02em",
  },
  topbarSep: {
    color: "#d1d5db",
    fontSize: "0.9rem",
  },
  tenantSelector: {
    position: "relative",
  },
  tenantBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    padding: "0.35rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#111827",
  },
  tenantDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    display: "inline-block",
  },
  tenantChevron: {
    fontSize: "0.65rem",
    color: "#6b7280",
    marginLeft: "0.25rem",
  },
  tenantDropdown: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
    minWidth: "220px",
    zIndex: 30,
    overflow: "hidden",
  },
  tenantItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "0.6rem 1rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.875rem",
    textAlign: "left",
    color: "#111827",
  },
  tenantItemRole: {
    fontSize: "0.75rem",
    color: "#6b7280",
    backgroundColor: "#f3f4f6",
    padding: "0.1rem 0.4rem",
    borderRadius: "4px",
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  userLabel: {
    fontSize: "0.875rem",
    color: "#4b5563",
    fontWeight: 500,
  },
  logoutBtn: {
    padding: "0.4rem 0.875rem",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.8rem",
  },
  main: {
    flex: 1,
    padding: "2rem 1.5rem",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  welcome: {
    marginBottom: "2rem",
  },
  welcomeTitle: {
    fontSize: "1.6rem",
    fontWeight: 800,
    margin: "0 0 0.25rem",
    letterSpacing: "-0.03em",
  },
  welcomeSub: {
    color: "#6b7280",
    fontSize: "0.9rem",
    margin: 0,
  },
  alertCard: {
    backgroundColor: "#fffbeb",
    border: "1px solid #f59e0b",
    borderRadius: "10px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    borderLeft: "4px solid #f59e0b",
  },
  alertTitle: {
    fontWeight: 700,
    fontSize: "1rem",
    margin: "0 0 0.5rem",
    color: "#92400e",
  },
  alertText: {
    color: "#78350f",
    fontSize: "0.9rem",
    margin: "0 0 1rem",
    lineHeight: 1.5,
  },
  successMsg: {
    color: "#166534",
    fontWeight: 600,
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
  },
  errorMsg: {
    color: "#991b1b",
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
  },
  bootstrapBtn: {
    padding: "0.6rem 1.25rem",
    backgroundColor: "#d97706",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  moduleSection: {
    marginBottom: "2.5rem",
  },
  sectionTitle: {
    fontSize: "0.75rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#6b7280",
    marginBottom: "0.75rem",
    margin: "0 0 0.75rem",
  },
  moduleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "1rem",
  },
  moduleCard: {
    display: "flex",
    gap: "1rem",
    padding: "1.25rem",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
    alignItems: "flex-start",
    transition: "box-shadow 0.15s",
    height: "100%",
    boxSizing: "border-box",
  },
  cardIconWrap: {
    width: "2.5rem",
    height: "2.5rem",
    borderRadius: "8px",
    backgroundColor: "rgba(0,0,0,0.04)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardIcon: {
    fontSize: "1.25rem",
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: "0.9rem",
    fontWeight: 700,
    margin: "0 0 0.3rem",
    color: "#111827",
    display: "flex",
    gap: "0.4rem",
    alignItems: "center",
    flexWrap: "wrap",
  },
  cardDesc: {
    color: "#6b7280",
    fontSize: "0.82rem",
    lineHeight: 1.5,
    margin: 0,
  },
  lockedHint: {
    color: "#9ca3af",
    fontSize: "0.75rem",
    marginTop: "0.4rem",
    fontStyle: "italic",
  },
  soonTag: {
    fontSize: "0.65rem",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    padding: "0.1rem 0.4rem",
    borderRadius: "4px",
    fontWeight: 600,
  },
  publicCatalogBanner: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "1.5rem",
    textAlign: "center",
    marginTop: "1rem",
  },
  bannerText: {
    color: "#4b5563",
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
  },
  bannerBtn: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.6rem 1.25rem",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.875rem",
    display: "inline-block",
  },
};
