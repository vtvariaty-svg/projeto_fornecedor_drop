"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService } from "../../../../../../services/auth.service";
import { adminProductsService, CreateProductPayload } from "../../../../../../services/admin-products.service";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<CreateProductPayload>({
    name: "",
    slug: "",
    description: "",
    status: "DRAFT",
    category: "",
    basePrice: 0,
    costPrice: undefined,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authService.isAuthenticated()) { router.replace("/login"); }
  }, [router]);

  function slugify(str: string) {
    return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value;
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Nome é obrigatório"); return; }
    if (!form.slug.trim()) { setError("Slug é obrigatório"); return; }
    if (form.basePrice <= 0) { setError("Preço base deve ser maior que zero"); return; }
    setSaving(true);
    setError(null);
    try {
      const product = await adminProductsService.create({
        ...form,
        description: form.description || undefined,
        category: form.category || undefined,
      });
      router.push(`/dashboard/admin/products/detail?id=${product.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div style={st.page}>
      <header style={st.header}>
        <div style={st.headerLeft}>
          <Link href="/dashboard/admin/products" style={st.backLink}>← Produtos</Link>
          <h1 style={st.title}>Novo produto</h1>
        </div>
      </header>

      <div style={st.body}>
        <form onSubmit={handleSubmit} style={st.form}>
          {error && <div style={st.error}>{error}</div>}

          <Field label="Nome *">
            <input style={st.input} value={form.name} onChange={handleNameChange} placeholder="Ex: Bolsa estruturada couro vegano" required />
          </Field>

          <Field label="Slug *">
            <input style={st.input} value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="bolsa-estruturada-couro-vegano" required />
          </Field>

          <Field label="Descrição">
            <textarea style={st.textarea} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={4} placeholder="Descrição detalhada do produto..." />
          </Field>

          <Field label="Categoria">
            <input style={st.input} value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ex: Bolsas, Acessórios" />
          </Field>

          <div style={st.row}>
            <Field label="Preço base (R$) *">
              <input style={st.input} type="number" min="0" step="0.01" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: parseFloat(e.target.value) || 0 }))} required />
            </Field>
            <Field label="Custo (R$)">
              <input style={st.input} type="number" min="0" step="0.01" value={form.costPrice ?? ""} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value ? parseFloat(e.target.value) : undefined }))} placeholder="Opcional" />
            </Field>
          </div>

          <Field label="Status">
            <select style={st.select} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="DRAFT">Rascunho</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </Field>

          <div style={st.actions}>
            <Link href="/dashboard/admin/products" style={st.cancelBtn}>Cancelar</Link>
            <button type="submit" disabled={saving} style={st.submitBtn}>
              {saving ? "Salvando..." : "Criar produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>{label}</label>
      {children}
    </div>
  );
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f3f4f6", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111827" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb" },
  headerLeft: { display: "flex", alignItems: "center", gap: "1rem" },
  backLink: { color: "#6b7280", textDecoration: "none", fontSize: "0.875rem" },
  title: { margin: 0, fontSize: "1.25rem", fontWeight: 700 },
  body: { padding: "1.5rem", maxWidth: "720px", margin: "0 auto" },
  form: { backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.75rem" },
  error: { marginBottom: "1rem", padding: "0.75rem 1rem", backgroundColor: "#fee2e2", color: "#991b1b", borderRadius: "6px", fontSize: "0.875rem" },
  input: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box", resize: "vertical" },
  select: { width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", backgroundColor: "#fff", boxSizing: "border-box" },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid #f3f4f6" },
  cancelBtn: { padding: "0.5rem 1rem", border: "1px solid #d1d5db", borderRadius: "6px", color: "#374151", textDecoration: "none", fontWeight: 600, fontSize: "0.875rem" },
  submitBtn: { padding: "0.5rem 1.25rem", backgroundColor: "#111827", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 700, fontSize: "0.875rem" },
};
