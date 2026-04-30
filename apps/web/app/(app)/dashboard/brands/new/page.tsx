"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { brandsService, CreateBrandPayload } from "../../../../../services/brands.service";

function getTenantId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("drop:tenant_id") ?? "";
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewBrandPage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState("");
  const [form, setForm] = useState<CreateBrandPayload>({
    name: "",
    slug: "",
    description: "",
    primaryColor: "",
    secondaryColor: "",
    accentColor: "",
    toneOfVoice: "",
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTenantId(getTenantId());
  }, []);

  function handleNameChange(value: string) {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugTouched ? f.slug : toSlug(value),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: toSlug(value) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) { setError("Nenhum tenant selecionado"); return; }
    if (!form.name.trim()) { setError("Nome obrigatorio"); return; }
    if (!form.slug.trim()) { setError("Slug obrigatorio"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const payload: CreateBrandPayload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        ...(form.description?.trim() && { description: form.description.trim() }),
        ...(form.primaryColor?.trim() && { primaryColor: form.primaryColor.trim() }),
        ...(form.secondaryColor?.trim() && { secondaryColor: form.secondaryColor.trim() }),
        ...(form.accentColor?.trim() && { accentColor: form.accentColor.trim() }),
        ...(form.toneOfVoice?.trim() && { toneOfVoice: form.toneOfVoice.trim() }),
      };
      const brand = await brandsService.create(tenantId, payload);
      router.push(`/dashboard/brands/detail?id=${brand.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => router.push("/dashboard/brands")} style={s.backBtn}>
          ← Voltar para marcas
        </button>
        <h1 style={s.title}>Nova Marca</h1>
      </div>

      <form onSubmit={handleSubmit} style={s.form}>
        <div style={s.section}>
          <h2 style={s.sectionTitle}>Identidade</h2>

          <label style={s.label}>
            Nome da marca <span style={s.required}>*</span>
            <input
              style={s.input}
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Minha Marca"
              maxLength={100}
            />
          </label>

          <label style={s.label}>
            Slug <span style={s.required}>*</span>
            <input
              style={s.input}
              value={form.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="minha-marca"
              maxLength={80}
            />
            <span style={s.hint}>Identificador unico. Apenas letras minusculas, numeros e hifens.</span>
          </label>

          <label style={s.label}>
            Descricao
            <textarea
              style={{ ...s.input, height: 80, resize: "vertical" }}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Breve descricao da marca"
              maxLength={500}
            />
          </label>

          <label style={s.label}>
            Tom de comunicacao
            <input
              style={s.input}
              value={form.toneOfVoice}
              onChange={(e) => setForm((f) => ({ ...f, toneOfVoice: e.target.value }))}
              placeholder="Ex: sofisticado, casual, minimalista"
              maxLength={200}
            />
          </label>
        </div>

        <div style={s.section}>
          <h2 style={s.sectionTitle}>Cores</h2>
          <div style={s.colorRow}>
            <label style={s.colorLabel}>
              Primaria
              <div style={s.colorInputWrap}>
                <input
                  type="color"
                  style={s.colorPicker}
                  value={form.primaryColor || "#111827"}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                />
                <input
                  style={{ ...s.input, marginBottom: 0, flex: 1 }}
                  value={form.primaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                  placeholder="#111827"
                  maxLength={7}
                />
              </div>
            </label>

            <label style={s.colorLabel}>
              Secundaria
              <div style={s.colorInputWrap}>
                <input
                  type="color"
                  style={s.colorPicker}
                  value={form.secondaryColor || "#6b7280"}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                />
                <input
                  style={{ ...s.input, marginBottom: 0, flex: 1 }}
                  value={form.secondaryColor}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                  placeholder="#6b7280"
                  maxLength={7}
                />
              </div>
            </label>

            <label style={s.colorLabel}>
              Destaque
              <div style={s.colorInputWrap}>
                <input
                  type="color"
                  style={s.colorPicker}
                  value={form.accentColor || "#3b82f6"}
                  onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                />
                <input
                  style={{ ...s.input, marginBottom: 0, flex: 1 }}
                  value={form.accentColor}
                  onChange={(e) => setForm((f) => ({ ...f, accentColor: e.target.value }))}
                  placeholder="#3b82f6"
                  maxLength={7}
                />
              </div>
            </label>
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}

        <div style={s.actions}>
          <button type="button" onClick={() => router.push("/dashboard/brands")} style={s.cancelBtn}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting} style={s.submitBtn}>
            {submitting ? "Criando…" : "Criar marca"}
          </button>
        </div>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 720, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" },
  header: { marginBottom: "1.5rem" },
  backBtn: { background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "0.9rem", padding: 0, marginBottom: "0.75rem", display: "block" },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 800 },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  section: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.5rem" },
  sectionTitle: { margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, borderBottom: "1px solid #f3f4f6", paddingBottom: "0.75rem" },
  label: { display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem", fontWeight: 500, color: "#374151" },
  required: { color: "#ef4444", marginLeft: "0.1rem" },
  input: { border: "1px solid #d1d5db", borderRadius: 6, padding: "0.6rem 0.75rem", fontSize: "0.95rem", marginBottom: "1rem", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" },
  hint: { fontSize: "0.78rem", color: "#9ca3af", marginTop: "-0.75rem", marginBottom: "0.5rem" },
  colorRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" },
  colorLabel: { display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.9rem", fontWeight: 500, color: "#374151" },
  colorInputWrap: { display: "flex", gap: "0.5rem", alignItems: "center" },
  colorPicker: { width: 36, height: 36, border: "none", padding: 0, borderRadius: 6, cursor: "pointer", flexShrink: 0 },
  error: { color: "#c00", fontWeight: 600, background: "#fee2e2", padding: "0.75rem 1rem", borderRadius: 6 },
  actions: { display: "flex", gap: "0.75rem", justifyContent: "flex-end" },
  cancelBtn: { padding: "0.65rem 1.5rem", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: "0.95rem" },
  submitBtn: { padding: "0.65rem 1.75rem", background: "#111", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.95rem" },
};
