import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div style={s.page}>
      {/* HEADER */}
      <header style={s.header}>
        <div style={s.logo}>D'OUTRO LADO B2B</div>
        <nav style={s.nav}>
          <Link href="/login" style={s.navLink}>
            Login
          </Link>
          <Link href="/dashboard" style={s.navLinkPrimary}>
            Dashboard
          </Link>
        </nav>
      </header>

      {/* HERO SECTION */}
      <main style={s.main}>
        <section style={s.hero}>
          <div style={s.heroContent}>
            <h1 style={s.title}>
              Crie sua própria marca de bolsas e acessórios sem fábrica, sem estoque e sem logística.
            </h1>
            <p style={s.subtitle}>
              Venda por dropshipping, evolua para white label e futuramente private label.
            </p>
            <div style={s.actions}>
              <Link href="/login" style={s.btnPrimary}>
                Entrar
              </Link>
              <Link href="/dashboard" style={s.btnSecondary}>
                Ver dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section style={s.features}>
          <h2 style={s.sectionTitle}>Módulos Disponíveis</h2>
          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.cardIcon}>🛍️</div>
              <h3 style={s.cardTitle}>Catálogo B2B</h3>
              <p style={s.cardDesc}>
                Acesse nossa seleção de bolsas e acessórios prontos para venda, com preços dinâmicos e fotos em alta qualidade.
              </p>
            </div>
            <div style={s.card}>
              <div style={s.cardIcon}>📦</div>
              <h3 style={s.cardTitle}>Estoque por SKU</h3>
              <p style={s.cardDesc}>
                Acompanhamento em tempo real do estoque disponível e reservado, com rastreabilidade completa de movimentações.
              </p>
            </div>
            <div style={s.card}>
              <div style={s.cardIcon}>📝</div>
              <h3 style={s.cardTitle}>Pedidos manuais</h3>
              <p style={s.cardDesc}>
                Fluxo transacional seguro com snapshot de preço e reserva automática de estoque para seus clientes.
              </p>
            </div>
            <div style={{ ...s.card, opacity: 0.7 }}>
              <div style={s.cardIcon}>🏷️</div>
              <h3 style={s.cardTitle}>White label <span style={s.badge}>Em breve</span></h3>
              <p style={s.cardDesc}>
                Personalização dos produtos com a sua marca. Adicione etiquetas, embalagens e bilhetes customizados.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={s.footer}>
        <p style={s.footerText}>MVP operacional em construção.</p>
      </footer>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#fafafa",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: "#111827",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 2rem",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontWeight: 800,
    fontSize: "1.25rem",
    letterSpacing: "-0.025em",
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
    fontSize: "0.95rem",
    transition: "color 0.2s",
  },
  navLinkPrimary: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#fff",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    fontWeight: 500,
    fontSize: "0.95rem",
    transition: "background-color 0.2s",
  },
  main: {
    flex: 1,
  },
  hero: {
    padding: "6rem 2rem 5rem",
    textAlign: "center",
    backgroundColor: "#fff",
    borderBottom: "1px solid rgba(0,0,0,0.05)",
    position: "relative",
    overflow: "hidden",
  },
  heroContent: {
    maxWidth: "800px",
    margin: "0 auto",
    position: "relative",
    zIndex: 2,
  },
  title: {
    fontSize: "clamp(2.5rem, 5vw, 4rem)",
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
    margin: "0 0 1.5rem 0",
    background: "linear-gradient(to right, #111827, #4b5563)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "1.25rem",
    color: "#4b5563",
    marginBottom: "2.5rem",
    lineHeight: 1.6,
    maxWidth: "600px",
    margin: "0 auto 2.5rem",
  },
  actions: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
  },
  btnPrimary: {
    textDecoration: "none",
    backgroundColor: "#111827",
    color: "#ffffff",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "1.1rem",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    transition: "transform 0.1s, box-shadow 0.1s",
  },
  btnSecondary: {
    textDecoration: "none",
    backgroundColor: "#ffffff",
    color: "#111827",
    border: "1px solid #d1d5db",
    padding: "0.875rem 2rem",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "1.1rem",
    transition: "background-color 0.2s",
  },
  features: {
    padding: "5rem 2rem",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: "2rem",
    fontWeight: 700,
    marginBottom: "3rem",
    letterSpacing: "-0.025em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "2rem",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    padding: "2rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 10px 15px -5px rgba(0,0,0,0.02)",
    border: "1px solid rgba(0,0,0,0.05)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  cardIcon: {
    fontSize: "2.5rem",
    marginBottom: "1rem",
  },
  cardTitle: {
    fontSize: "1.25rem",
    fontWeight: 700,
    margin: "0 0 0.75rem 0",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  badge: {
    fontSize: "0.7rem",
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
    padding: "0.2rem 0.5rem",
    borderRadius: "999px",
    fontWeight: 600,
  },
  cardDesc: {
    color: "#6b7280",
    lineHeight: 1.6,
    margin: 0,
    fontSize: "0.95rem",
  },
  footer: {
    textAlign: "center",
    padding: "2rem",
    borderTop: "1px solid rgba(0,0,0,0.05)",
    color: "#9ca3af",
    fontSize: "0.875rem",
  },
  footerText: {
    margin: 0,
  },
};
