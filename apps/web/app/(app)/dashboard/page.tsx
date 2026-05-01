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
  const hasActiveTenant = !hasNoTenants && !!activeTenant;

  return (
    <div style={st.page}>
      {/* Top Bar */}
      <header style={st.topbar}>
        <div style={st.topbarLeft}>
          <Link href="/" style={st.brand}>Portal B2B</Link>
          <span style={st.topbarSep}>|</span>
          {tenants.length > 0 && (
            <div style={st.tenantSelector}>
              <button onClick={() => setTenantOpen((o) => !o)} style={st.tenantBtn}>
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
          <Link href="/catalogo" style={st.topNavLink}>Catálogo público</Link>
          <span style={st.userLabel}>{user.name}</span>
          <button onClick={handleLogout} style={st.logoutBtn}>Sair</button>
        </div>
      </header>

      <main style={st.main}>
        <div style={st.container}>

          {/* Welcome + Tenant summary */}
          <div style={st.welcomeRow}>
            <div style={st.welcome}>
              <h1 style={st.welcomeTitle}>Olá, {user.name.split(" ")[0]}</h1>
              <p style={st.welcomeSub}>
                {hasActiveTenant
                  ? `Operando como ${activeTenant!.name} · ${activeTenant!.role}`
                  : isAdmin ? "Administrador da plataforma" : "Nenhuma empresa ativa"}
              </p>
            </div>
            <div style={st.roleBadgeWrap}>
              <span style={{ ...st.roleBadge, backgroundColor: isAdmin ? "#fef3c7" : "#eff6ff", color: isAdmin ? "#92400e" : "#1d4ed8" }}>
                {user.role.replace("_", " ")}
              </span>
            </div>
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
              <div style={st.publicCatalogBanner}>
                <p style={st.bannerText}>Enquanto isso, consulte o catálogo público sem precisar de conta.</p>
                <Link href="/catalogo" style={st.bannerBtn}>Ver catálogo público</Link>
              </div>
            </div>
          )}

          {/* Onboarding checklist */}
          {hasActiveTenant && (
            <div style={st.onboarding}>
              <h2 style={st.onboardingTitle}>Primeiros passos</h2>
              <div style={st.onboardingGrid}>
                <OnboardingStep
                  num={1}
                  title="Consulte o catálogo"
                  desc="Veja os produtos disponíveis para revenda com preços de fornecedor."
                  href="/dashboard/catalog"
                  done={false}
                />
                <OnboardingStep
                  num={2}
                  title="Crie seu primeiro pedido"
                  desc="Registre um pedido manual de dropshipping para começar a operar."
                  href="/dashboard/orders/new"
                  done={false}
                />
                <OnboardingStep
                  num={3}
                  title="Crie sua marca própria"
                  desc="Configure sua marca para pedidos white label. Etapa opcional."
                  href="/dashboard/brands"
                  done={false}
                  optional
                />
                <OnboardingStep
                  num={4}
                  title="Acompanhe seus pedidos"
                  desc="Monitore status, rastreamento e histórico dos seus pedidos."
                  href="/dashboard/orders"
                  done={false}
                />
                <OnboardingStep
                  num={5}
                  title="Conecte sua loja"
                  desc="Integre Shopify, Nuvemshop ou WooCommerce para automação."
                  href="#"
                  done={false}
                  soon
                />
              </div>
            </div>
          )}

          {/* Modules */}
          {hasActiveTenant && (
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
                  desc="Crie um pedido de dropshipping padrão ou white label sem estoque próprio."
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

              {/* Operação */}
              <ModuleSection title="Operação">
                <ModuleCardItem
                  icon="📊"
                  title="Status de pedidos"
                  desc="Visualize o andamento dos pedidos em tempo real."
                  href="/dashboard/orders"
                  color="#f0fdf4"
                />
                <ModuleCardItem
                  icon="📉"
                  title="Estoque disponível"
                  desc="Consulte disponibilidade de SKUs no catálogo do fornecedor."
                  href="/dashboard/catalog"
                  color="#f0fdf4"
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
                  desc="Personalize produtos com sua identidade visual (etiquetas, embalagens)."
                  href="/dashboard/brands"
                  color="#fdf4ff"
                  soon
                  locked
                />
              </ModuleSection>

              {/* Integrações */}
              <ModuleSection title="Integrações">
                <ModuleCardItem
                  icon="🟢"
                  title="Shopify"
                  desc="Sincronize produtos e pedidos com sua loja Shopify."
                  locked
                  soon
                  color="#f9fafb"
                />
                <ModuleCardItem
                  icon="🔵"
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
                icon="🧾"
                title="Pedidos / Admin"
                desc="Visualize e gerencie todos os pedidos da plataforma."
                href="/dashboard/orders"
                color="#fef3c7"
              />
              <ModuleCardItem
                icon="🏢"
                title="Tenants"
                desc="Gerencie empresas, usuários e permissões da plataforma."
                href="#"
                color="#fef3c7"
                soon
              />
              <ModuleCardItem
                icon="🏷"
                title="Marcas / Admin"
                desc="Revise e aprove marcas e ativos de white label dos tenants."
                href="/dashboard/brands"
                color="#fef3c7"
              />
            </ModuleSection>
          )}

        </div>
      </main>

      <footer style={st.footer}>
        <p style={st.footerText}>
          Plataforma B2B de fornecimento dropshipping ·{" "}
          <Link href="/catalogo" style={st.footerLink}>Catálogo público</Link>
        </p>
      </footer>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function OnboardingStep({
  num, title, desc, href, done, optional, soon,
}: {
  num: number; title: string; desc: string; href: string;
  done?: boolean; optional?: boolean; soon?: boolean;
}) {
  const content = (
    <div style={{ ...st.onboardingStep, opacity: soon ? 0.6 : 1 }}>
      <div style={{ ...st.onboardingNum, backgroundColor: done ? "#16a34a" : "#111827" }}>
        {done ? "✓" : num}
      </div>
      <div style={st.onboardingStepBody}>
        <p style={st.onboardingStepTitle}>
          {title}
          {optional && <span style={st.optionalBadge}>Opcional</span>}
          {soon && <span style={st.soonTag}>Em breve</span>}
        </p>
        <p style={st.onboardingStepDesc}>{desc}</p>
      </div>
    </div>
  );
  if (soon || !href || href === "#") return content;
  return <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{content}</Link>;
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
  icon, title, desc, href, locked, soon, color,
}: {
  icon: string; title: string; desc: string;
  href?: string; locked?: boolean; soon?: boolean; color?: string;
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
          <p style={st.lockedHint}>Disponível em breve para tenants ativos.</p>
        )}
      </div>
    </div>
  );

  if (href && !locked) {
    return <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  }
  return inner;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#111827",
    display: "flex",
    flexDirection: "column",
  },
  center: { textAlign: "center", marginTop: "4rem", color: "#6b7280" },
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
  topbarLeft: { display: "flex", alignItems: "center", gap: "0.75rem" },
  brand: { fontWeight: 800, fontSize: "1rem", color: "#111827", textDecoration: "none", letterSpacing: "-0.02em" },
  topbarSep: { color: "#d1d5db", fontSize: "0.9rem" },
  tenantSelector: { position: "relative" },
  tenantBtn: {
    display: "flex", alignItems: "center", gap: "0.4rem",
    background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "6px",
    padding: "0.35rem 0.75rem", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, color: "#111827",
  },
  tenantDot: { width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#22c55e", display: "inline-block" },
  tenantChevron: { fontSize: "0.65rem", color: "#6b7280", marginLeft: "0.25rem" },
  tenantDropdown: {
    position: "absolute", top: "calc(100% + 4px)", left: 0,
    backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", minWidth: "220px", zIndex: 30, overflow: "hidden",
  },
  tenantItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    width: "100%", padding: "0.6rem 1rem", border: "none", cursor: "pointer",
    fontSize: "0.875rem", textAlign: "left", color: "#111827",
  },
  tenantItemRole: { fontSize: "0.75rem", color: "#6b7280", backgroundColor: "#f3f4f6", padding: "0.1rem 0.4rem", borderRadius: "4px" },
  topbarRight: { display: "flex", alignItems: "center", gap: "0.75rem" },
  topNavLink: { fontSize: "0.8rem", color: "#4b5563", textDecoration: "none", fontWeight: 500 },
  userLabel: { fontSize: "0.875rem", color: "#4b5563", fontWeight: 500 },
  logoutBtn: { padding: "0.4rem 0.875rem", backgroundColor: "#fee2e2", color: "#991b1b", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" },
  main: { flex: 1, padding: "2rem 1.5rem" },
  container: { maxWidth: "1100px", margin: "0 auto" },
  welcomeRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "0.75rem" },
  welcome: {},
  welcomeTitle: { fontSize: "1.6rem", fontWeight: 800, margin: "0 0 0.25rem", letterSpacing: "-0.03em" },
  welcomeSub: { color: "#6b7280", fontSize: "0.9rem", margin: 0 },
  roleBadgeWrap: { paddingTop: "0.25rem" },
  roleBadge: { fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "6px", letterSpacing: "0.03em" },
  alertCard: { backgroundColor: "#fffbeb", border: "1px solid", borderRadius: "10px", padding: "1.5rem", marginBottom: "1.5rem", borderLeft: "4px solid #f59e0b" },
  alertTitle: { fontWeight: 700, fontSize: "1rem", margin: "0 0 0.5rem", color: "#111827" },
  alertText: { color: "#78350f", fontSize: "0.9rem", margin: "0 0 1rem", lineHeight: 1.5 },
  successMsg: { color: "#166534", fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.75rem" },
  errorMsg: { color: "#991b1b", fontSize: "0.9rem", marginBottom: "0.75rem" },
  bootstrapBtn: { padding: "0.6rem 1.25rem", backgroundColor: "#d97706", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "0.9rem" },
  publicCatalogBanner: { backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1rem 1.25rem", marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" },
  bannerText: { color: "#4b5563", fontSize: "0.875rem", margin: 0 },
  bannerBtn: { textDecoration: "none", backgroundColor: "#111827", color: "#fff", padding: "0.5rem 1rem", borderRadius: "6px", fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" },
  // Onboarding
  onboarding: { backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.5rem", marginBottom: "2rem" },
  onboardingTitle: { fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", margin: "0 0 1rem" },
  onboardingGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem" },
  onboardingStep: { display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.875rem", backgroundColor: "#f9fafb", borderRadius: "8px", border: "1px solid #f3f4f6" },
  onboardingNum: { width: "1.75rem", height: "1.75rem", borderRadius: "50%", color: "#fff", fontWeight: 800, fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  onboardingStepBody: {},
  onboardingStepTitle: { fontSize: "0.8rem", fontWeight: 700, margin: "0 0 0.2rem", color: "#111827", display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" },
  onboardingStepDesc: { fontSize: "0.75rem", color: "#6b7280", margin: 0, lineHeight: 1.4 },
  optionalBadge: { fontSize: "0.6rem", backgroundColor: "#f3f4f6", color: "#9ca3af", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 600 },
  // Modules
  moduleSection: { marginBottom: "2.5rem" },
  sectionTitle: { fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280", marginBottom: "0.75rem", margin: "0 0 0.75rem" },
  moduleGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" },
  moduleCard: { display: "flex", gap: "1rem", padding: "1.25rem", borderRadius: "10px", border: "1px solid #e5e7eb", alignItems: "flex-start", transition: "box-shadow 0.15s", height: "100%", boxSizing: "border-box" },
  cardIconWrap: { width: "2.5rem", height: "2.5rem", borderRadius: "8px", backgroundColor: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardIcon: { fontSize: "1.25rem" },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.3rem", color: "#111827", display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" },
  cardDesc: { color: "#6b7280", fontSize: "0.82rem", lineHeight: 1.5, margin: 0 },
  lockedHint: { color: "#9ca3af", fontSize: "0.75rem", marginTop: "0.4rem", fontStyle: "italic" },
  soonTag: { fontSize: "0.65rem", backgroundColor: "#f3f4f6", color: "#6b7280", padding: "0.1rem 0.4rem", borderRadius: "4px", fontWeight: 600 },
  footer: { textAlign: "center", padding: "1.5rem", borderTop: "1px solid #e5e7eb", backgroundColor: "#fff" },
  footerText: { margin: 0, fontSize: "0.8rem", color: "#9ca3af" },
  footerLink: { color: "#6b7280", textDecoration: "none", fontWeight: 600 },
};
