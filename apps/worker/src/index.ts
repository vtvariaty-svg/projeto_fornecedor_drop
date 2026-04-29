// Worker entrypoint.
// BullMQ + Redis will be wired here in a future phase.
// For now this process simply starts and signals it is alive.

console.log("[worker] Plataforma Drop Worker iniciado.");
console.log("[worker] Ambiente:", process.env.NODE_ENV ?? "development");
console.log(
  "[worker] Filas BullMQ serão configuradas em fase futura quando REDIS_URL estiver disponível."
);

async function main() {
  console.log("[worker] Aguardando jobs...");
  // Keep the process alive (Render Background Worker expects a long-running process).
  setInterval(() => {
    console.log("[worker] heartbeat", new Date().toISOString());
  }, 30_000);
}

main().catch((err) => {
  console.error("[worker] Erro fatal:", err);
  process.exit(1);
});
