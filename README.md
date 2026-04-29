# Plataforma Drop — Fundação Técnica

Monorepo da plataforma B2B de dropshipping, white label e private label para bolsas e acessórios.

---

## Estratégia de Deploy — Serviço Único no Render

**Decisão de negócio (Fase 0):** o deploy inicial usa **apenas um Web Service** no Render para minimizar custos.

A API NestJS serve tanto os endpoints backend (`/api/*`) quanto o frontend Next.js buildado como arquivos estáticos (via `ServeStaticModule`).

```
Render Web Service (único)
└── NestJS API (apps/api)
    ├── GET /api/health → NestJS HealthController
    ├── GET /api/...    → Controllers futuros
    └── GET /*          → Next.js static export (apps/web/out/)
```

**Worker e Cron Jobs:** o código de `apps/worker` existe e builda localmente, mas **não é provisionado no Render nesta fase**. Será ativado em serviço separado apenas quando o volume operacional justificar o custo adicional.

---

## Estrutura do Monorepo

```
plataforma-drop/
├── apps/
│   ├── api/        # Backend NestJS — expõe /api/* e serve o frontend
│   ├── web/        # Frontend Next.js (static export → out/)
│   └── worker/     # Background Worker (código pronto, sem deploy ainda)
├── packages/
│   ├── database/   # Prisma client + schema (Neon PostgreSQL)
│   └── shared/     # Tipos e helpers compartilhados
├── .env.example
├── render.yaml     # Um único Web Service
├── pnpm-workspace.yaml
└── package.json
```

**Package manager:** pnpm  
**Workspaces:** `apps/*` e `packages/*`

---

## Apps e Packages

| Pacote             | Descrição                                                     |
|--------------------|---------------------------------------------------------------|
| `api`              | NestJS — REST API + serve frontend estático em produção       |
| `web`              | Next.js 14 static export — frontend do lojista                |
| `worker`           | Node.js — jobs em background (sem deploy na Fase 0)           |
| `@drop/database`   | Prisma Client + schema Neon PostgreSQL                        |
| `@drop/shared`     | Tipos e helpers compartilhados entre apps                     |

---

## Pré-requisitos

- Node.js 20+
- pnpm 9+

```bash
npm install -g pnpm
```

---

## Instalação

```bash
pnpm install
```

---

## Variáveis de Ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

### DATABASE_URL vs DIRECT_URL (Neon PostgreSQL)

| Variável       | Finalidade                                                   |
|----------------|--------------------------------------------------------------|
| `DATABASE_URL` | Conexão **pooled** via PgBouncer — usada em **runtime**      |
| `DIRECT_URL`   | Conexão **direta** — usada somente em **migrations** Prisma  |

---

## Rodando Localmente

### Separado (recomendado para dev)

```bash
# Terminal 1 — API (http://localhost:3001)
pnpm dev:api

# Terminal 2 — Web (http://localhost:3000)
pnpm dev:web
```

Configure `apps/web/.env.local` para o dev local:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Testando o fluxo unificado (API + frontend estático)

```bash
# 1. Gerar o Prisma client
pnpm db:generate

# 2. Buildar frontend e API
pnpm build:prod

# 3. Iniciar o servidor unificado
node apps/api/dist/main.js
```

Acesse `http://localhost:3001`:
- Página inicial → servida pelo frontend estático
- `/login` → página estática de login
- `/dashboard` → página estática do dashboard
- `GET /api/health` → health check da API

### Worker

```bash
pnpm dev:worker
```

---

## Prisma

### Gerar o client

```bash
pnpm db:generate
# ou
pnpm --filter database prisma generate
```

### Validar o schema

```bash
pnpm db:validate
# ou
pnpm --filter database prisma validate
```

### Criar migration (desenvolvimento)

```bash
pnpm db:migrate
```

### Aplicar migrations (produção)

```bash
pnpm --filter database prisma migrate deploy
```

---

## Build

```bash
# Build de produção (database → web → api)
pnpm build:prod

# Build individual
pnpm build:api
pnpm build:web
pnpm build:worker
```

---

## Lint e Testes

```bash
pnpm lint
pnpm test
```

> Testes são placeholders nesta fase — serão implementados com os módulos de negócio.

---

## render.yaml — Serviço Único

O `render.yaml` provisiona **um único Web Service** chamado `plataforma-drop`:

| Campo          | Valor                                                                              |
|----------------|------------------------------------------------------------------------------------|
| Build command  | `pnpm install && prisma generate && web build && api build`                        |
| Start command  | `node apps/api/dist/main.js`                                                       |
| Porta          | `process.env.PORT` (injetado pelo Render)                                          |

Variáveis sensíveis estão marcadas com `sync: false` e devem ser configuradas manualmente no painel do Render.

---

## Como o Frontend é Servido

Em produção:
1. `pnpm --filter web build` gera `apps/web/out/` (HTML/CSS/JS estáticos)
2. `ServeStaticModule` no NestJS serve esses arquivos a partir de `/`
3. Rotas `/api/*` são excluídas do serving estático e vão para os controllers

Chamadas da API no frontend usam URL relativa `/api` (sem domínio), evitando CORS e sem expor variáveis de ambiente em produção.

---

## Limitações do Static Export

- Sem SSR (Server-Side Rendering)
- Sem API Routes do Next.js (`/app/api/`)
- Sem ISR (Incremental Static Regeneration)
- `next/image` com `unoptimized: true`

Para fases futuras que exijam SSR (ex: SEO de catálogo público), o Next.js pode ser migrado para modo servidor em um serviço separado.

---

## Arquivos de Usuário

**IMPORTANTE:** Nunca salve arquivos enviados por usuários no filesystem local do Render.  
O filesystem do Render é efêmero. Use storage S3-compatible externo via `STORAGE_*` variáveis.

---

## Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| Serviço único na Fase 0 | Minimizar custo no Render antes de ter volume operacional |
| Next.js static export | Permite servir o frontend pelo NestJS sem segundo processo |
| Global prefix `/api` | Separa claramente rotas de backend de assets estáticos |
| Worker sem deploy | Código pronto para futuro, sem custo agora |
| `NEXT_PUBLIC_API_URL` opcional em produção | Sem variável = URL relativa `/api`, zero config no Render |

---

## Pendências para Próximas Fases

- [ ] Implementar autenticação JWT com refresh token
- [ ] Implementar RBAC por tenant
- [ ] Implementar módulos de catálogo, pedidos e estoque
- [ ] Configurar BullMQ + Redis e ativar worker no Render
- [ ] Configurar storage S3-compatible para upload de assets
- [ ] Implementar white label e private label
- [ ] Adicionar testes unitários e de integração
- [ ] Avaliar migração para Next.js servidor se SSR for necessário
