# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**MDOS** — AI 原生不动产管理 SaaS 平台，pnpm monorepo，包含 NestJS 后端（`apps/api`）和 React 前端（`apps/web`）。

## Common Commands

### Start Infrastructure
```bash
docker-compose up -d   # Start PostgreSQL (5432) and Redis (6379)
```

### Install Dependencies
```bash
pnpm install           # Install all workspace packages
```

### Seed Demo Data
```bash
pnpm --filter api seed # Injects DEMO tenant, admin user, and sample data
```

### Development
```bash
pnpm dev                         # Start both api + web concurrently
pnpm --filter api start:dev      # Backend only (port 3001, watch mode)
pnpm --filter web dev            # Frontend only (port 5173, HMR)
```

### Build
```bash
pnpm build                       # Build both api + web
pnpm --filter api build          # NestJS build → dist/
pnpm --filter web build          # Vite build → dist/
```

### Database Migrations
```bash
pnpm --filter api migration:generate   # Generate new migration
pnpm --filter api migration:run        # Run pending migrations
```

## Architecture

### Backend (apps/api) — NestJS 10 + TypeORM + PostgreSQL

**Entry & Config**
- `src/main.ts` — global prefix `api/v1`, CORS for `localhost:5173`, Swagger at `/api/docs`
- `src/app.module.ts` — registers all modules and global providers: `JwtAuthGuard`, `RolesGuard`, `TransformInterceptor`, `TenantInterceptor`, `AllExceptionsFilter`
- `apps/api/.env` — runtime config (PORT=3001, JWT secrets, DB/Redis connection)

**Global Middleware Chain (app.module.ts)**
1. `JwtAuthGuard` (APP_GUARD) — validates JWT on all routes; skip with `@Public()`
2. `RolesGuard` (APP_GUARD) — checks `@Roles(...)` metadata from JWT user roles
3. `TransformInterceptor` — wraps all responses as `{ code, message, data, timestamp }`
4. `TenantInterceptor` — extracts `tenantId` from JWT into `request.tenantId`
5. `AllExceptionsFilter` — catches all errors, returns same `{ code, message, data, timestamp }` shape

**Common Layer (`src/common/`)**
- `decorators/index.ts` — `@Public()`, `@Roles(...)`, `@RequirePermissions(...)`
- `entities/base.entity.ts` — all entities extend this: UUID PK + `createdAt`, `updatedAt`, `deletedAt`
- `dto/pagination.dto.ts` — `PaginationDto` base class + `paginate()` helper returns `{ list, total, page, pageSize }`

**Business Modules (13)**

| Module | Key entities | Notes |
|--------|-------------|-------|
| `auth` | — | Login, refresh token, JWT strategy |
| `users` | `user.entity` | Per-tenant users with roles array |
| `tenants` | `tenant.entity` | Tenant registration and lookup |
| `permissions` | `role.entity`, `permission.entity` | RBAC roles + fine-grained permissions |
| `units` | `project`, `building`, `floor`, `unit` | 4-level hierarchy; unit has status + position |
| `customers` | `customer`, `customer-contact` | CRM with grade A/B/C |
| `contracts` | `contract`, `contract-rent-rule` | Full lifecycle; billingType enum |
| `billing` | `bill`, `bill-item`, `receivable` | Bill generation, send, AR tracking |
| `financial` | `payment` | Payment registration, income reports, aging |
| `llm-models` | `llm-provider`, `llm-model` | Multi-supplier LLM config, task-level binding |
| `contract-ai` | — | AI contract parsing with dynamic model selection + fallback |
| `notifications` | `notification` | System notifications |
| `settings` | `system-setting` | Key-value tenant config |
| `asset-map` | (reuses units entities) | Read-only spatial queries |

**Multi-tenancy**: every entity has a `tenantId` field. Services filter all queries by `tenantId` from `request.tenantId`. TypeORM `synchronize: true` in non-production.

**Authentication**: dual JWT tokens — access (2h) + refresh (7d). `POST /auth/login` accepts `{ tenantCode, username, password }`.

### LLM Model Management Architecture (`src/llm-models/`)

**Purpose**: Enable per-tenant AI model configuration, supporting multiple LLM suppliers (OpenAI, Anthropic, etc.) and dynamic model selection for different AI tasks.

**Core Entities**
- `llm-provider.entity.ts` — Stores supplier credentials (API key, endpoint) and metadata
- `llm-model.entity.ts` — Defines specific models bound to providers and AI task types

**Key Services**
- `llm-provider.service.ts` — Manage suppliers: CRUD, enable/disable, priority sorting
- `llm-model.service.ts` — Manage models: CRUD, task-type lookup, default model selection, provider lookup

**Integration Pattern**
Other AI modules (e.g., `contract-ai`) inject `LlmModelService` and call:
```typescript
const models = await llmModelService.findByTaskType(tenantId, AiTaskType.CONTRACT_PARSING)
// Returns models in priority order; with fallback mechanism for model failure
```

**API Endpoints**
- `POST/GET/PUT/DELETE /api/v1/llm-providers` — Supplier management
- `POST/GET/PUT/DELETE /api/v1/llm-models` — Model management
- `GET /api/v1/llm-models/task/:taskType` — Get models for specific task
- `GET /api/v1/llm-models/default-mapping` — Get default models for all tasks

### Frontend (apps/web) — React 18 + Vite + Ant Design 5

**Startup Chain**
`main.tsx` → Redux `<Provider>` → `<BrowserRouter>` → AntD `<ConfigProvider locale=zhCN>` → `<App>`

**Routing (`src/router/`)**
- All 11 pages are `React.lazy()` loaded; wrapped in `<Suspense>`
- `App.tsx` splits routes: `/login` (public) vs `/*` inside `PrivateRoute` → `MainLayout`
- `PrivateRoute` checks `isAuthenticated` from Redux; redirects to `/login` if false

**State Management (`src/store/`)**
- Only `authSlice` in Redux — stores `user`, `token`, `refreshToken`, `isAuthenticated`
- `setCredentials` persists to `localStorage`; `logout` clears it
- **All other page data is local state** (`useState + useEffect`) — `store/api/` directory is empty/reserved for future RTK Query

**API Layer (`src/utils/request.ts`)**
- Axios instance with `baseURL: '/api/v1'` (proxied to `localhost:3001` by Vite)
- Request interceptor: adds `Authorization: Bearer <token>` from localStorage
- Response interceptor: unwraps `ApiResponse<T>.data`; on 401 clears auth and redirects to `/login`

**Pages (`src/pages/`)** — each page self-manages its data with `useEffect` calling `request.get/post` directly. No dedicated service layer.

**Utilities**
- `src/utils/format.ts` — `formatCurrency`, `formatDate`, `formatDateTime`, `formatRelativeTime`, `getStatusColor`, `getStatusLabel`
- `src/types/index.ts` — all shared TypeScript types (`User`, `Unit`, `Contract`, `Bill`, etc.)
- `src/hooks/useAuth.ts` — thin wrapper around `useSelector(state.auth)` + `dispatch(logout())`

**Path alias**: `@/` → `src/` (configured in both `vite.config.ts` and `tsconfig.json`)

## Demo Credentials

| Field | Value |
|-------|-------|
| Tenant Code | `DEMO` |
| Username | `admin` |
| Password | `Admin@123` |

## Key Conventions

- **Response shape**: always `{ code: number, message: string, data: T, timestamp: string }`
- **Pagination shape**: always `{ list: T[], total: number, page: number, pageSize: number }`
- **Public endpoints**: mark with `@Public()` decorator — **required** for `POST /auth/login` and any unauthenticated routes
- **New backend modules**: extend `BaseEntity`, add `tenantId: string` column, filter by `request.tenantId` in service, register in `app.module.ts`
- **New frontend pages**: add lazy import in `router/index.tsx`, add menu entry in `layouts/MainLayout.tsx`, add breadcrumb entry in the `breadcrumbMap`
