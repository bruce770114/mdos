// ─── Generic API shapes ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: string
}

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// ─── Identity & Auth ───────────────────────────────────────────────────────

export interface User {
  id: string
  tenantId: string
  username: string
  email: string
  phone?: string
  status: string
  roles: string[]
  lastLoginAt?: string
  isPlatformAdmin?: boolean
  language?: string
}

export interface Tenant {
  id: string
  name: string
  code: string
  slug?: string | null
  subDomain?: string | null
  logoUrl?: string
  status: string
  lifecycleStatus?: string
  spaceId?: string | null
  currentPlanId?: string | null
  trialExpiresAt?: string | null
  subscriptionExpiresAt?: string | null
}

// ─── Platform Admin (5.10) ──────────────────────────────────────────────────

export interface Space {
  id: string
  spaceId: string
  name: string
  type: 'shared' | 'dedicated'
  dbInstance: string
  schemaName: string
  region: string
  maxTenants: number
  currentTenants: number
  storageUsedGB: number
  storageLimitGB: number
  status: 'active' | 'full' | 'locked' | 'deprecated'
  notes?: string | null
  createdAt: string
}

export interface SubscriptionPlan {
  id: string
  planId: string
  name: string
  tier: 'trial' | 'standard' | 'professional' | 'enterprise'
  priceMonthly: number
  priceYearly: number
  maxUsers: number
  maxProjects: number
  storageGB: number
  trialDays: number
  isActive: boolean
  description?: string | null
  features?: Record<string, boolean | number> | null
}

export interface SubscriptionOrder {
  id: string
  orderId: string
  tenantId: string
  planId: string
  orderType: 'new' | 'renewal' | 'upgrade' | 'downgrade' | 'gift'
  billingCycle: 'monthly' | 'yearly'
  amount: number
  validFrom?: string | null
  validTo?: string | null
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'cancelled'
  paymentMethod: string
  paidAt?: string | null
  invoiceStatus: 'not_applied' | 'applied' | 'issued'
  createdAt: string
}

export interface TenantDomain {
  id: string
  tenantId: string
  domain: string
  type: 'subdomain' | 'custom'
  status: 'pending' | 'verifying' | 'active' | 'failed' | 'disabled'
  cnameTarget?: string | null
  sslStatus: 'pending' | 'active' | 'expired'
  verifiedAt?: string | null
}

export interface AuditLog {
  id: string
  tenantId?: string | null
  userId?: string | null
  username?: string | null
  action: string
  module: string
  resourceId?: string | null
  changes?: Record<string, any> | null
  ipAddress?: string | null
  success: boolean
  errorMessage?: string | null
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
}

// ─── Real-estate assets ────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  address: string
  city: string
  lat?: number
  lng?: number
  totalArea?: number
  status: string
  createdAt: string
}

export interface Building {
  id: string
  projectId: string
  name: string
  floorCount: number
  totalArea?: number
}

export interface Floor {
  id: string
  buildingId: string
  floorNo: number
  floorName: string
  totalArea?: number
  floorPlanUrl?: string
}

export type UnitStatus = 'vacant' | 'rented' | 'reserved' | 'renovating' | 'maintenance'
export type UnitType = 'office' | 'retail' | 'warehouse' | 'other'

export interface Unit {
  id: string
  floorId: string
  unitNo: string
  area: number
  areaUsable?: number
  unitType: UnitType
  status: UnitStatus
  position?: { x: number; y: number; width: number; height: number }
}

// ─── CRM ───────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  companyName: string
  creditCode?: string
  legalPerson?: string
  contactName: string
  phone: string
  email?: string
  industry?: string
  grade?: 'A' | 'B' | 'C'
  tags?: string[]
}

// ─── Contracts ─────────────────────────────────────────────────────────────

export type ContractStatus =
  | 'draft'
  | 'pending_approval'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'terminated'

export type BillingType =
  | 'fixed'
  | 'stepped'
  | 'guarantee_plus_share'
  | 'pure_share'

export interface Contract {
  id: string
  contractNo: string
  customerId: string
  customerName?: string
  unitId: string
  unitNo?: string
  startDate: string
  endDate: string
  baseRent: number
  propertyFee: number
  billingType: BillingType
  status: ContractStatus
  totalAmount?: number
}

// ─── Billing & Finance ─────────────────────────────────────────────────────

export type BillStatus =
  | 'pending_review'
  | 'reviewed'
  | 'sent'
  | 'paid'
  | 'overdue'

export interface Bill {
  id: string
  billNo: string
  contractId: string
  customerId: string
  customerName?: string
  unitNo?: string
  periodStart: string
  periodEnd: string
  totalAmount: number
  status: BillStatus
  dueDate: string
  sentAt?: string
  paidAt?: string
}

export interface BillItem {
  id: string
  billId: string
  itemType: string
  description: string
  amount: number
  quantity: number
  unitPrice: number
}

export interface Receivable {
  id: string
  billId: string
  customerId: string
  customerName?: string
  amount: number
  paidAmount: number
  balance: number
  status: string
  dueDate: string
  overdueDays: number
}

export interface Payment {
  id: string
  receivableId: string
  customerId: string
  amount: number
  paymentDate: string
  paymentMethod: string
  reference?: string
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface Notification {
  id: string
  type: string
  title: string
  content: string
  isRead: boolean
  isProcessed: boolean
  readAt?: string | null
  createdAt: string
}

// ─── RBAC ──────────────────────────────────────────────────────────────────

export interface Role {
  id: string
  name: string
  code: string
  description?: string
  isSystem: boolean
}

export interface Permission {
  id: string
  code: string
  module: string
  action: string
  resource?: string
}

// ─── LLM Model Management (5.9) ────────────────────────────────────────────

export type LlmProviderType = 'openai' | 'anthropic' | 'tongyi' | 'qwen' | 'custom'

export interface LlmProvider {
  id: string
  tenantId: string
  name: string
  providerType: LlmProviderType
  apiKey: string // UI上不展示实际值，仅用于修改时可见掩码
  apiEndpoint?: string | null
  enabled: boolean
  priority: number
  metadata?: Record<string, any> | null
  description?: string | null
  createdAt: string
  updatedAt: string
}

export type AiTaskType =
  | 'contract_parsing'
  | 'customer_analysis'
  | 'bill_generation'
  | 'document_ocr'
  | 'data_summarization'
  | 'other'

export interface LlmModel {
  id: string
  tenantId: string
  llmProviderId: string
  modelId: string
  modelName: string
  aiTaskType: AiTaskType
  isDefault: boolean
  enabled: boolean
  maxInputTokens?: number | null
  maxOutputTokens?: number | null
  costPerMilTokenInput?: number | null
  costPerMilTokenOutput?: number | null
  priority: number
  parameters?: Record<string, any> | null
  description?: string | null
  provider?: LlmProvider
  createdAt: string
  updatedAt: string
}
