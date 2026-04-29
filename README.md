# Plataforma Drop — Fundação Técnica

Monorepo da plataforma B2B de dropshipping, white label e private label para bolsas e acessórios.

---

## Estrutura do Monorepo

```
plataforma-drop/
├── apps/
│   ├── api/        # Backend NestJS (TypeScript)
│   ├── web/        # Frontend Next.js App Router (TypeScript)
│   └── worker/     # Background Worker Node.js (TypeScript)
├── packages/
│   ├── database/   # Prisma client + schema (PostgreSQL Neon)
│   └── shared/     # Tipos e utilitários compartilhados
├── .env.example
├── render.yaml
├── pnpm-workspace.yaml
└── package.json
```

**Package manager:** pnpm  
**Workspaces:** `apps/*` e `packages/*`

---

## Apps e Packages

| Pacote             | Descrição                                          |
|--------------------|----------------------------------------------------|
| `api`              | NestJS — REST API, health check, módulos futuros   |
| `web`              | Next.js 14 App Router — frontend do lojista        |
| `worker`           | Node.js — processamento de jobs em background      |
| `@drop/database`   | Prisma Client + schema Neon PostgreSQL             |
| `@drop/shared`     | Tipos e helpers compartilhados entre apps          |

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

No painel do Neon você encontra as duas strings. O Prisma usa `directUrl` para `migrate` e `generate`, e `url` para queries em runtime.

---

## Rodando Localmente

### API (NestJS)

```bash
pnpm dev:api
# ou
pnpm --filter api dev
```

A API sobe em `http://localhost:3001`.  
Health check: `GET http://localhost:3001/health`

### Web (Next.js)

```bash
pnpm dev:web
# ou
pnpm --filter web dev
```

Frontend em `http://localhost:3000`.  
Configure `NEXT_PUBLIC_API_URL=http://localhost:3001` no `.env.local` dentro de `apps/web`.

### Worker

```bash
pnpm dev:worker
# ou
pnpm --filter worker dev
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
# ou
pnpm --filter database prisma migrate dev
```

### Aplicar migrations (produção)

```bash
pnpm --filter database prisma migrate deploy
```

---

## Build

```bash
# Todos os apps
pnpm build

# Individual
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

> Os testes são placeholders nesta fase. Serão implementados nas próximas fases junto com os módulos de negócio.

---

## render.yaml

O arquivo `render.yaml` na raiz define três serviços no Render:

| Serviço                  | Tipo              | Start command              |
|--------------------------|-------------------|----------------------------|
| `plataforma-drop-api`    | Web Service       | `node dist/main.js`        |
| `plataforma-drop-web`    | Web Service       | `node .next/standalone/server.js` |
| `plataforma-drop-worker` | Background Worker | `node dist/index.js`       |

**Variáveis sensíveis** (`DATABASE_URL`, `JWT_SECRET`, etc.) estão marcadas com `sync: false` — devem ser configuradas manualmente no painel do Render, **nunca em código**.

A API usa `process.env.PORT` (injetado automaticamente pelo Render).

---

## Decisões Técnicas

| Decisão | Motivo |
|---------|--------|
| `DATABASE_URL` pooled + `DIRECT_URL` direct | Neon recomenda PgBouncer em runtime; migrations precisam de conexão direta |
| `Product` sem relação obrigatória com `Brand` | Produto base é da operação; lojista customiza via opções |
| `OrderItem` com campos snapshot | Garante imutabilidade histórica mesmo se produto mudar |
| `InventoryItem` com `quantityAvailable` + `quantityReserved` | Permite reserva sem baixa de estoque antes do envio |
| `TenantUser` como tabela de junção | Prepara multi-tenancy: um usuário pode pertencer a múltiplos tenants |
| `cuid()` como ID padrão | Sortable, URL-safe, colisão baixíssima sem UUID v4 |
| Worker com `setInterval` heartbeat | Render exige processo de longa duração para Background Worker |
| `output: standalone` no Next.js | Necessário para `node .next/standalone/server.js` no Render |

---

## Arquivos de Usuário

**IMPORTANTE:** Nunca salve arquivos enviados por usuários no filesystem local do Render.  
O filesystem do Render é efêmero. Use storage S3-compatible externo (Cloudflare R2 ou AWS S3) via `STORAGE_*` variáveis de ambiente.

---

## Pendências para Próximas Fases

- [ ] Implementar autenticação JWT com refresh token
- [ ] Implementar RBAC por tenant
- [ ] Implementar módulos de catálogo, pedidos e estoque
- [ ] Configurar BullMQ + Redis para jobs assíncronos
- [ ] Configurar storage S3-compatible para upload de assets
- [ ] Implementar white label (customização de marca por tenant)
- [ ] Implementar private label (coleções customizadas)
- [ ] Adicionar testes unitários e de integração
- [ ] Configurar CI/CD no GitHub Actions
