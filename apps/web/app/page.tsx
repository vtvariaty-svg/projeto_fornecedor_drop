import React from "react";
import Link from "next/link";
import { APP_NAME } from "../lib/config";

export default function HomePage() {
  return (
    <div style={s.page}>
      {/* HEADER */}
      <header style={s.header}>
        <div style={s.logo}>{APP_NAME}</div>
        <nav style={s.nav}>
          <Link href="/catalogo" style={s.navLink}>
            Catálogo
          </Link>
          <a href="#como-funciona" style={s.navLink}>
            Como funciona
          </a>
          <Link href="/login" style={s.navLink}>
            Entrar
          </Link>
          <Link href="/login" style={s.navBtnPrimary}>
            Criar conta / solicitar acesso
          </Link>
        </nav>
      </header>

      <main style={s.main}>
        {/* HERO */}
        <section style={s.hero}>
          <div style={s.heroContent}>
            <span style={s.heroBadge}>Plataforma de fornecedor dropshipping</span>
            <h1 style={s.heroTitle}>
              Venda bolsas e acessórios por dropshipping com preços de fornecedor.
            </h1>
            <p style={s.heroSubtitle}>
              Acesse produtos prontos, veja preços, venda sem estoque e deixe separação e envio com o fornecedor.
            </p>
            <div style={s.heroActions}>
              <Link href="/catalogo" style={s.btnPrimary}>
                Ver catálogo
              </Link>
              <Link href="/login" style={s.btnSecondary}>
                Entrar na plataforma
              </Link>
            </div>
            <p style={s.heroNote}>
              Catálogo aberto para consulta. Login necessário para criar pedidos.
            </p>
          </div>
        </section>

        {/* BENEFÍCIOS */}
        <section style={s.section}>
          <div style={s.container}>
            <h2 style={s.sectionTitle}>Por que vender por dropshipping com o fornecedor?</h2>
            <div style={s.benefitsGrid}>
              {BENEFITS.map((b) => (
                <div key={b.title} style={s.benefitCard}>
                  <span style={s.benefitIcon}>{b.icon}</span>
                  <h3 style={s.benefitTitle}>{b.title}</h3>
                  <p style={s.benefitDesc}>{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}
        <section id="como-funciona" style={{ ...s.section, backgroundColor: "#fff" }}>
          <div style={s.container}>
            <h2 style={s.sectionTitle}>Como funciona</h2>
            <div style={s.stepsGrid}>
              {STEPS.map((step, i) => (
                <div key={step.title} style={s.stepCard}>
                  <div style={s.stepNum}>{i + 1}</div>
                  <h3 style={s.stepTitle}>{step.title}</h3>
                  <p style={s.stepDesc}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MÓDULOS */}
        <section style={s.section}>
          <div style={s.container}>
            <h2 style={s.sectionTitle}>O que está disponível na plataforma</h2>
            <div style={s.modulesGrid}>
              {MODULES.map((mod) => (
                <div key={mod.title} style={{ ...s.moduleCard, opacity: mod.soon ? 0.65 : 1 }}>
                  <span style={s.moduleIcon}>{mod.icon}</span>
                  <div style={s.moduleText}>
                    <h3 style={s.moduleTitle}>
                      {mod.title}
                      {mod.soon && <span style={s.soonBadge}>Em breve</span>}
                    </h3>
                    <p style={s.moduleDesc}>{mod.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section style={s.ctaSection}>
          <div style={s.ctaContent}>
            <h2 style={s.ctaTitle}>Pronto para começar?</h2>
            <p style={s.ctaSubtitle}>
              Consulte o catálogo sem precisar criar conta. Quando estiver pronto, entre para criar seus primeiros pedidos.
            </p>
            <div style={s.ctaActions}>
              <Link href="/catalogo" style={s.btnPrimary}>
                Ver catálogo de produtos
              </Link>
              <Link href="/login" style={s.btnWhite}>
                Entrar para criar pedidos
              </Link>
            </div>
            <p style={s.ctaNote}>
              Sem estoque. Sem fábrica. Sem logística. O fornecedor cuida do restante.
            </p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={s.footer}>
        <p style={s.footerText}>
          Plataforma B2B de fornecimento dropshipping para bolsas e acessórios.{" "}
          <Link href="/catalogo" style={s.footerLink}>
            Ver catálogo
          </Link>
          {" · "}
          <Link href="/login" style={s.footerLink}>
            Entrar
          </Link>
        </p>
      </footer>
    </div>
  );
}

const BENEFITS = [
  { icon: "📦", title: "Sem estoque próprio", desc: "Venda sem precisar comprar ou guardar produtos. O fornecedor mantém o estoque." },
  { icon: "🏭", title: "Sem fábrica", desc: "Nenhum investimento em produção. Os produtos já estão prontos para revenda." },
  { icon: "🚚", title: "Sem logística", desc: "Separação e envio por conta do fornecedor. Você vende, ele entrega." },
  { icon: "🛍", title: "Produtos prontos", desc: "Catálogo de bolsas e acessórios disponíveis imediatamente para revenda." },
  { icon: "💰", title: "Preço de fornecedor", desc: "Acesso direto ao preço de fornecedor para maximizar sua margem de revenda." },
  { icon: "🏷", title: "Marca própria opcional", desc: "Comece com dropshipping padrão. Evolua para white label quando quiser." },
];

const STEPS = [
  { title: "Escolha os produtos", desc: "Consulte o catálogo aberto e veja preços de fornecedor sem precisar fazer login." },
  { title: "Venda para seus clientes", desc: "Anuncie nos seus canais: redes sociais, loja virtual ou venda direta." },
  { title: "Crie o pedido na plataforma", desc: "Com login ativo, registre o pedido diretamente no painel operacional." },
  { title: "O fornecedor cuida do restante", desc: "Separação, embalagem e envio por conta do fornecedor. Você recebe a confirmação." },
];

const MODULES = [
  { icon: "🛒", title: "Dropshipping padrão", desc: "Venda produtos do catálogo sem marca ou personalização. Modelo mais simples.", soon: false },
  { icon: "📋", title: "Catálogo de produtos", desc: "Consulte produtos, SKUs, fotos e preços de fornecedor a qualquer momento.", soon: false },
  { icon: "📝", title: "Pedidos manuais", desc: "Crie pedidos pelo painel com snapshot de preço e rastreamento integrado.", soon: false },
  { icon: "🏷", title: "White label", desc: "Adicione sua marca ao produto: etiqueta, embalagem e bilhete personalizado.", soon: false },
  { icon: "🔗", title: "Integrações", desc: "Shopify, Nuvemshop, WooCommerce e API aberta para lojistas.", soon: true },
];

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f9fafb",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#111827",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontWeight: 800,
    fontSize: "1.2rem",
    letterSpacing: "-0.025em",
  },
  nav: {
    display: "flex",
    gap: "1.25rem",
    alignItems: "center",
  },
  navLink: {
    textDecoration: "none",
    color: "#4b5563",
    fontWeight: 500,
    fontSize: "0.9rem",
  },
  navBtnPrimary: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "0.875rem",
    whiteSpace: "nowrap",
  },
  main: { flex: 1 },
  hero: {
    padding: "6rem 2rem 5rem",
    textAlign: "center",
    backgroundColor: "#fff",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
  },
  heroContent: {
    maxWidth: "780px",
    margin: "0 auto",
  },
  heroBadge: {
    display: "inline-block",
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    fontSize: "0.8rem",
    fontWeight: 700,
    padding: "0.3rem 0.75rem",
    borderRadius: "999px",
    marginBottom: "1.5rem",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: "clamp(2rem, 5vw, 3.5rem)",
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: "-0.04em",
    margin: "0 0 1.5rem",
    color: "#111827",
  },
  heroSubtitle: {
    fontSize: "1.2rem",
    color: "#4b5563",
    lineHeight: 1.7,
    margin: "0 auto 2.5rem",
    maxWidth: "580px",
  },
  heroActions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  heroNote: {
    marginTop: "1.5rem",
    fontSize: "0.85rem",
    color: "#9ca3af",
  },
  section: {
    padding: "5rem 2rem",
    backgroundColor: "#f9fafb",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: "1.75rem",
    fontWeight: 800,
    marginBottom: "3rem",
    letterSpacing: "-0.03em",
    color: "#111827",
  },
  benefitsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "1.5rem",
  },
  benefitCard: {
    backgroundColor: "#fff",
    borderRadius: "12px",
    padding: "1.75rem",
    border: "1px solid #e5e7eb",
  },
  benefitIcon: {
    fontSize: "2rem",
    display: "block",
    marginBottom: "0.75rem",
  },
  benefitTitle: {
    fontWeight: 700,
    fontSize: "1rem",
    margin: "0 0 0.5rem",
    color: "#111827",
  },
  benefitDesc: {
    color: "#6b7280",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
  },
  stepsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  },
  stepCard: {
    textAlign: "center",
    padding: "1.5rem 1rem",
  },
  stepNum: {
    width: "3rem",
    height: "3rem",
    borderRadius: "50%",
    backgroundColor: "#111827",
    color: "#fff",
    fontWeight: 800,
    fontSize: "1.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
  },
  stepTitle: {
    fontWeight: 700,
    fontSize: "1rem",
    margin: "0 0 0.5rem",
    color: "#111827",
  },
  stepDesc: {
    color: "#6b7280",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
  },
  modulesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "1rem",
  },
  moduleCard: {
    display: "flex",
    gap: "1rem",
    backgroundColor: "#fff",
    borderRadius: "10px",
    padding: "1.25rem",
    border: "1px solid #e5e7eb",
    alignItems: "flex-start",
  },
  moduleIcon: {
    fontSize: "1.5rem",
    flexShrink: 0,
  },
  moduleText: {},
  moduleTitle: {
    fontWeight: 700,
    fontSize: "0.95rem",
    margin: "0 0 0.35rem",
    color: "#111827",
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
  },
  moduleDesc: {
    color: "#6b7280",
    fontSize: "0.875rem",
    lineHeight: 1.5,
    margin: 0,
  },
  soonBadge: {
    fontSize: "0.65rem",
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    padding: "0.15rem 0.4rem",
    borderRadius: "4px",
    fontWeight: 600,
  },
  ctaSection: {
    backgroundColor: "#111827",
    padding: "5rem 2rem",
    textAlign: "center",
  },
  ctaContent: {
    maxWidth: "680px",
    margin: "0 auto",
  },
  ctaTitle: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "#fff",
    margin: "0 0 1rem",
    letterSpacing: "-0.03em",
  },
  ctaSubtitle: {
    color: "#9ca3af",
    fontSize: "1.1rem",
    lineHeight: 1.7,
    marginBottom: "2rem",
  },
  ctaActions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: "1.25rem",
  },
  ctaNote: {
    color: "#6b7280",
    fontSize: "0.85rem",
    margin: 0,
  },
  btnPrimary: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "1rem",
    border: "2px solid #374151",
    display: "inline-block",
  },
  btnSecondary: {
    textDecoration: "none",
    backgroundColor: "#fff",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "1rem",
    display: "inline-block",
  },
  btnWhite: {
    textDecoration: "none",
    backgroundColor: "#fff",
    color: "#111827",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    fontWeight: 700,
    fontSize: "1rem",
    display: "inline-block",
  },
  footer: {
    textAlign: "center",
    padding: "2rem",
    borderTop: "1px solid rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
    color: "#9ca3af",
    fontSize: "0.875rem",
  },
  footerText: { margin: 0 },
  footerLink: {
    color: "#6b7280",
    fontWeight: 600,
    textDecoration: "none",
  },
};
