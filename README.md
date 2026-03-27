# MDOS - AI原生不动产管理SaaS平台

基于 PRD v1.3 实现的第一阶段 MVP，覆盖9大核心模块。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Ant Design 5 + Redux Toolkit |
| 后端 | NestJS 10 + TypeScript + TypeORM |
| 数据库 | PostgreSQL 15 |
| 缓存 | Redis 7 |
| 认证 | JWT (access + refresh token) |

## 快速启动

### 前置条件
- Node.js >= 18
- pnpm >= 8
- Docker & Docker Compose

### 1. 启动基础设施

```bash
cd /path/to/mdos
docker-compose up -d
```

等待 postgres 和 redis 就绪（约 10 秒）。

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp apps/api/.env apps/api/.env.local
# 按需修改 apps/api/.env 中的配置
```

### 4. 初始化数据库（可选，注入演示数据）

```bash
pnpm --filter api seed
```

### 5. 启动后端

```bash
pnpm --filter api start:dev
```

后端运行在 `http://localhost:3000`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`

### 6. 启动前端

```bash
pnpm --filter web dev
```

前端运行在 `http://localhost:5173`

---

## 演示账号

| 字段 | 值 |
|------|-----|
| 租户代码 | `DEMO` |
| 用户名 | `admin` |
| 密码 | `Admin@123` |

---

## 模块说明

| 路由 | 模块 | 功能 |
|------|------|------|
| `/dashboard` | 运营看板 | 出租率、应收汇总、到期合同、逾期账单 |
| `/units` | 租赁单元 | 项目/楼宇/楼层/单元 CRUD，状态管理 |
| `/customers` | 客户管理 | 租户档案，联系人，合同历史 |
| `/contracts` | 合同管理 | 合同全生命周期，计租类型，到期提醒 |
| `/billing` | 账务管理 | 账单生成，审核发送，应收账款 |
| `/financial` | 财务管理 | 收款登记，应收汇总，收入报表，账龄分析 |
| `/asset-map` | 资产地图 | 项目地图→楼宇视图→楼层平面图 |
| `/permissions` | 权限管理 | RBAC 角色权限，用户管理 |
| `/settings` | 系统设置 | 基础配置，集成配置，数据管理 |
| `/notifications` | 通知中心 | 消息聚合，分类过滤，偏好设置 |

---

## API 结构

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/profile

CRUD   /api/v1/users
CRUD   /api/v1/roles
GET    /api/v1/permissions

CRUD   /api/v1/projects
CRUD   /api/v1/buildings
CRUD   /api/v1/floors
CRUD   /api/v1/units
GET    /api/v1/units/statistics
PATCH  /api/v1/units/:id/status

CRUD   /api/v1/customers
CRUD   /api/v1/contracts
GET    /api/v1/contracts/expiring
POST   /api/v1/contracts/:id/terminate

GET    /api/v1/bills
POST   /api/v1/bills
PATCH  /api/v1/bills/:id/status
GET    /api/v1/receivables

POST   /api/v1/finance/payments
GET    /api/v1/finance/receivables/summary
GET    /api/v1/finance/reports/income
GET    /api/v1/finance/reports/aging

GET    /api/v1/asset-map/projects
GET    /api/v1/asset-map/projects/:id/buildings
GET    /api/v1/asset-map/floors/:id/units

GET    /api/v1/notifications
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/notifications/mark-all-read

GET    /api/v1/settings
PUT    /api/v1/settings/:category/:key
```

---

## 项目结构

```
mdos/
├── apps/
│   ├── api/          # NestJS 后端
│   │   └── src/
│   │       ├── auth/
│   │       ├── users/
│   │       ├── tenants/
│   │       ├── permissions/
│   │       ├── units/
│   │       ├── customers/
│   │       ├── contracts/
│   │       ├── billing/
│   │       ├── financial/
│   │       ├── notifications/
│   │       ├── settings/
│   │       ├── asset-map/
│   │       └── common/
│   └── web/          # React 前端
│       └── src/
│           ├── pages/
│           ├── layouts/
│           ├── store/
│           ├── router/
│           ├── components/
│           ├── hooks/
│           ├── types/
│           └── utils/
├── docker-compose.yml
└── package.json
```
