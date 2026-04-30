"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, UserData, TenantData } from "../../../services/auth.service";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [activeTenant, setActiveTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);

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
        const first = tenants[0] ?? null;
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
  }

  if (loading) return <p style={styles.center}>Carregando...</p>;
  if (!user) return null;

  return (
    <main style={styles.main}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Dashboard</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Sair
          </button>
        </header>

        <section style={styles.card}>
          <h2 style={styles.section}>Usuário autenticado</h2>
          <p><strong>Nome:</strong> {user.name}</p>
          <p><strong>E-mail:</strong> {user.email}</p>
          <p><strong>Perfil:</strong> {user.role}</p>
        </section>

        <section style={styles.card}>
          <h2 style={styles.section}>Seus tenants</h2>
          {tenants.length === 0 ? (
            <p style={{ color: "#666" }}>Nenhum tenant vinculado.</p>
          ) : (
            <ul style={styles.list}>
              {tenants.map((t) => (
                <li key={t.id} style={styles.listItem}>
                  <button
                    onClick={() => selectTenant(t)}
                    style={{
                      ...styles.tenantBtn,
                      background: activeTenant?.id === t.id ? "#111" : "#f0f0f0",
                      color: activeTenant?.id === t.id ? "#fff" : "#333",
                    }}
                  >
                    {t.name} ({t.slug}) — {t.role}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {activeTenant && (
          <section style={styles.card}>
            <h2 style={styles.section}>Acesso rápido</h2>
            <div style={styles.quickLinks}>
              <button
                onClick={() => router.push("/dashboard/catalog")}
                style={styles.quickBtn}
              >
                🛍 Ver Catálogo
              </button>
              <button
                onClick={() => router.push("/dashboard/orders")}
                style={styles.quickBtn}
              >
                📦 Meus Pedidos
              </button>
              <button
                onClick={() => router.push("/dashboard/orders/new")}
                style={{ ...styles.quickBtn, background: "#166534" }}
              >
                + Novo Pedido
              </button>
              <button
                onClick={() => router.push("/dashboard/brands")}
                style={{ ...styles.quickBtn, background: "#4f46e5" }}
              >
                Brand Studio
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: { minHeight: "100vh", background: "#f5f5f5", fontFamily: "system-ui, sans-serif" },
  center: { textAlign: "center", marginTop: "4rem", color: "#666" },
  container: { maxWidth: "720px", margin: "0 auto", padding: "2rem 1rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { margin: 0, fontSize: "1.5rem" },
  logoutBtn: { padding: "0.5rem 1rem", background: "#c00", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" },
  card: { background: "#fff", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", marginBottom: "1rem" },
  section: { margin: "0 0 1rem", fontSize: "1rem", color: "#333" },
  list: { margin: 0, padding: 0, listStyle: "none" },
  listItem: { marginBottom: "0.5rem" },
  tenantBtn: { border: "none", borderRadius: "4px", padding: "0.4rem 0.75rem", cursor: "pointer", fontSize: "0.875rem" },
  quickLinks: { display: "flex", gap: "0.75rem", flexWrap: "wrap" },
  quickBtn: { padding: "0.6rem 1.25rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.9rem" },
};
