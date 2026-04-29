"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService, UserData, TenantData } from "../../../services/auth.service";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      })
      .catch(() => {
        authService.logout().then(() => router.replace("/login"));
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    await authService.logout();
    router.replace("/login");
  }

  if (loading) return <p style={styles.center}>Carregando...</p>;
  if (error) return <p style={styles.center}>{error}</p>;
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
                  <strong>{t.name}</strong> ({t.slug}) — {t.role} — {t.status}
                </li>
              ))}
            </ul>
          )}
        </section>
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
  list: { margin: 0, paddingLeft: "1.25rem" },
  listItem: { marginBottom: "0.5rem" },
};
