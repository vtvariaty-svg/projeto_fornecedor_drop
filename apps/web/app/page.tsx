export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        gap: "1rem",
      }}
    >
      <h1>Plataforma Drop</h1>
      <p>B2B Dropshipping &amp; White Label — em construção.</p>
      <nav style={{ display: "flex", gap: "1rem" }}>
        <a href="/login">Login</a>
        <a href="/dashboard">Dashboard</a>
      </nav>
    </main>
  );
}
