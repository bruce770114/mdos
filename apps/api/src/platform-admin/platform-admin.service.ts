import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Space, SpaceStatus } from './entities/space.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { SubscriptionOrder } from './entities/subscription-order.entity';
import { TenantDomain } from './entities/tenant-domain.entity';
import { Tenant, TenantLifecycleStatus } from '../tenants/tenant.entity';
import { AuditLog } from '../audit-log/audit-log.entity';
import { User } from '../users/user.entity';
import { SystemConfig } from './entities/system-config.entity';
import { paginate, PaginatedResult } from '../common/dto/pagination.dto';
import * as bcrypt from 'bcryptjs';
import dayjs from 'dayjs';

@Injectable()
export class PlatformAdminService {
  constructor(
    @InjectRepository(Space)
    private readonly spaceRepo: Repository<Space>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    @InjectRepository(SubscriptionOrder)
    private readonly orderRepo: Repository<SubscriptionOrder>,
    @InjectRepository(TenantDomain)
    private readonly domainRepo: Repository<TenantDomain>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  // ──────────────────────── Dashboard ────────────────────────

  async getDashboardStats() {
    const [total, trial, active, suspended, expiringSoon] = await Promise.all([
      this.tenantRepo.count(),
      this.tenantRepo.count({ where: { lifecycleStatus: 'trial' } }),
      this.tenantRepo.count({ where: { lifecycleStatus: 'active' } }),
      this.tenantRepo.count({ where: { lifecycleStatus: 'suspended' } }),
      this.tenantRepo
        .createQueryBuilder('t')
        .where('t.subscription_expires_at BETWEEN NOW() AND NOW() + INTERVAL \'30 days\'')
        .getCount(),
    ]);

    const recentOrders = await this.orderRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const monthlyRevenue = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'total')
      .where("o.payment_status = 'paid'")
      .andWhere("o.paid_at >= date_trunc('month', NOW())")
      .getRawOne();

    return {
      tenantStats: { total, trial, active, suspended, expiringSoon },
      monthlyRevenue: parseFloat(monthlyRevenue?.total ?? '0'),
      recentOrders,
    };
  }

  // ──────────────────────── Revenue Report ────────────────────────

  async getRevenueStats(period: 'month' | 'quarter' | 'year' = 'month') {
    const interval = period === 'month' ? '1 month' : period === 'quarter' ? '3 months' : '1 year';

    // Total revenue
    const totalRevenue = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'total')
      .where("o.payment_status = 'paid'")
      .getRawOne();

    // Period revenue
    const periodRevenue = await this.orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'total')
      .where("o.payment_status = 'paid'")
      .andWhere(`o.paid_at >= NOW() - INTERVAL '${interval}'`)
      .getRawOne();

    // Orders by plan
    const byPlan = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.plan_id', 'planId')
      .addSelect('COALESCE(SUM(o.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where("o.payment_status = 'paid'")
      .andWhere(`o.paid_at >= NOW() - INTERVAL '${interval}'`)
      .groupBy('o.plan_id')
      .getRawMany();

    // Orders by month (last 12 months)
    const monthlyTrend = await this.orderRepo
      .createQueryBuilder('o')
      .select("date_trunc('month', o.paid_at)", 'month')
      .addSelect('COALESCE(SUM(o.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where("o.payment_status = 'paid'")
      .andWhere("o.paid_at >= NOW() - INTERVAL '12 months'")
      .groupBy("date_trunc('month', o.paid_at)")
      .orderBy('month', 'ASC')
      .getRawMany();

    // Orders by payment method
    const byPaymentMethod = await this.orderRepo
      .createQueryBuilder('o')
      .select('o.payment_method', 'method')
      .addSelect('COALESCE(SUM(o.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where("o.payment_status = 'paid'")
      .groupBy('o.payment_method')
      .getRawMany();

    // Order count stats
    const orderStats = await this.orderRepo
      .createQueryBuilder('o')
      .select('COUNT(*)', 'total')
      .addSelect("SUM(CASE WHEN o.payment_status = 'paid' THEN 1 ELSE 0 END)", 'paid')
      .addSelect("SUM(CASE WHEN o.payment_status = 'pending' THEN 1 ELSE 0 END)", 'pending')
      .where(`o."createdAt" >= NOW() - INTERVAL '${interval}'`)
      .getRawOne();

    return {
      totalRevenue: parseFloat(totalRevenue?.total ?? '0'),
      periodRevenue: parseFloat(periodRevenue?.total ?? '0'),
      byPlan: byPlan.map(p => ({
        planId: p.planId,
        total: parseFloat(p.total),
        count: parseInt(p.count),
      })),
      monthlyTrend: monthlyTrend.map(m => ({
        month: m.month,
        total: parseFloat(m.total),
        count: parseInt(m.count),
      })),
      byPaymentMethod: byPaymentMethod.map(p => ({
        method: p.method,
        total: parseFloat(p.total),
        count: parseInt(p.count),
      })),
      orderStats: {
        total: parseInt(orderStats?.total ?? '0'),
        paid: parseInt(orderStats?.paid ?? '0'),
        pending: parseInt(orderStats?.pending ?? '0'),
      },
    };
  }

  // ──────────────────────── Tenants (platform level) ────────────────────────

  async listTenants(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    lifecycleStatus?: TenantLifecycleStatus;
    planId?: string;
  }): Promise<PaginatedResult<Tenant>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const qb = this.tenantRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');

    if (opts.search) {
      qb.andWhere('(t.name ILIKE :q OR t.code ILIKE :q OR t.slug ILIKE :q)', {
        q: `%${opts.search}%`,
      });
    }
    if (opts.lifecycleStatus) {
      qb.andWhere('t.lifecycle_status = :ls', { ls: opts.lifecycleStatus });
    }
    if (opts.planId) {
      qb.andWhere('t.current_plan_id = :planId', { planId: opts.planId });
    }

    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return paginate(list, total, page, pageSize);
  }

  async getTenantDetail(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`租户 ${id} 不存在`);

    const [orders, domains, currentPlan] = await Promise.all([
      this.orderRepo.find({
        where: { tenantId: id },
        order: { createdAt: 'DESC' },
        take: 20,
      }),
      this.domainRepo.find({ where: { tenantId: id } }),
      tenant.currentPlanId
        ? this.planRepo.findOne({ where: { planId: tenant.currentPlanId } })
        : Promise.resolve(null),
    ]);

    return { tenant, orders, domains, currentPlan };
  }

  async createTenant(dto: {
    name: string;
    code: string;
    slug: string;
    spaceId: string;
    planId: string;
    adminEmail: string;
    adminPassword: string;
    contactName?: string;
    phone?: string;
    notes?: string;
  }) {
    // Validate slug uniqueness
    const existingSlug = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existingSlug) throw new ConflictException(`Slug "${dto.slug}" 已被占用`);

    const existingCode = await this.tenantRepo.findOne({ where: { code: dto.code } });
    if (existingCode) throw new ConflictException(`租户代码 "${dto.code}" 已被占用`);

    // Validate space availability
    const space = await this.spaceRepo.findOne({ where: { spaceId: dto.spaceId } });
    if (!space) throw new NotFoundException(`存储空间 ${dto.spaceId} 不存在`);
    if (space.status === 'full') throw new BadRequestException('该存储空间已满，无法接入新租户');
    if (space.status === 'locked' || space.status === 'deprecated')
      throw new BadRequestException('该存储空间不可用');

    const plan = await this.planRepo.findOne({ where: { planId: dto.planId } });
    if (!plan) throw new NotFoundException(`套餐 ${dto.planId} 不存在`);

    const trialExpiresAt =
      plan.tier === 'trial' ? dayjs().add(plan.trialDays || 14, 'day').toDate() : null;

    const tenant = this.tenantRepo.create({
      name: dto.name,
      code: dto.code,
      slug: dto.slug,
      subDomain: `${dto.slug}.mdos.com`,
      spaceId: dto.spaceId,
      currentPlanId: dto.planId,
      lifecycleStatus: plan.tier === 'trial' ? 'trial' : 'active',
      trialExpiresAt,
      status: 'active',
    });
    const saved = await this.tenantRepo.save(tenant);

    // Create subdomain record
    await this.domainRepo.save(
      this.domainRepo.create({
        tenantId: saved.id,
        domain: `${dto.slug}.mdos.com`,
        type: 'subdomain',
        status: 'active',
        sslStatus: 'active',
      }),
    );

    // Update space tenant count
    await this.spaceRepo.increment({ spaceId: dto.spaceId }, 'currentTenants', 1);

    return saved;
  }

  async updateTenantLifecycle(
    id: string,
    lifecycleStatus: TenantLifecycleStatus,
    notes?: string,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`租户 ${id} 不存在`);

    tenant.lifecycleStatus = lifecycleStatus;
    // Sync legacy status
    if (lifecycleStatus === 'active' || lifecycleStatus === 'trial') {
      tenant.status = 'active';
    } else if (lifecycleStatus === 'suspended' || lifecycleStatus === 'stopped') {
      tenant.status = 'suspended';
    } else if (lifecycleStatus === 'cancelled') {
      tenant.status = 'inactive';
    }

    return this.tenantRepo.save(tenant);
  }

  async updateTenantSpace(id: string, newSpaceId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`租户 ${id} 不存在`);

    const newSpace = await this.spaceRepo.findOne({ where: { spaceId: newSpaceId } });
    if (!newSpace) throw new NotFoundException(`存储空间 ${newSpaceId} 不存在`);

    if (newSpace.status !== 'active') {
      throw new BadRequestException(`存储空间 ${newSpaceId} 状态不可用: ${newSpace.status}`);
    }

    // Check capacity for shared space
    if (newSpace.type === 'shared' && newSpace.currentTenants >= newSpace.maxTenants) {
      throw new BadRequestException(`存储空间 ${newSpaceId} 已满`);
    }

    const oldSpaceId = tenant.spaceId;

    // Update tenant's space
    tenant.spaceId = newSpaceId;
    await this.tenantRepo.save(tenant);

    // Update space tenant counts
    if (oldSpaceId && oldSpaceId !== newSpaceId) {
      // Decrease old space count
      await this.spaceRepo.increment({ spaceId: oldSpaceId }, 'currentTenants', -1);
    }
    // Increase new space count
    await this.spaceRepo.increment({ spaceId: newSpaceId }, 'currentTenants', 1);

    return tenant;
  }

  // ──────────────────────── Spaces ────────────────────────

  async listSpaces() {
    return this.spaceRepo.find({ order: { createdAt: 'ASC' } });
  }

  async getAvailableSpaces(tier?: string) {
    const qb = this.spaceRepo
      .createQueryBuilder('s')
      .where("s.status NOT IN ('full', 'locked', 'deprecated')");

    if (tier && tier !== 'enterprise') {
      qb.andWhere("s.type = 'shared'");
    }

    return qb.orderBy('s.currentTenants', 'ASC').getMany();
  }

  async createSpace(dto: {
    spaceId: string;
    name: string;
    type: 'shared' | 'dedicated';
    dbInstance: string;
    schemaName: string;
    region: string;
    maxTenants?: number;
    storageLimitGB?: number;
    notes?: string;
  }) {
    const existing = await this.spaceRepo.findOne({ where: { spaceId: dto.spaceId } });
    if (existing) throw new ConflictException(`存储空间 ${dto.spaceId} 已存在`);

    const space = this.spaceRepo.create({
      ...dto,
      maxTenants: dto.type === 'dedicated' ? 1 : (dto.maxTenants ?? 50),
      storageLimitGB: dto.storageLimitGB ?? 500,
    });
    return this.spaceRepo.save(space);
  }

  async updateSpace(
    spaceId: string,
    dto: { maxTenants?: number; status?: SpaceStatus; notes?: string },
  ) {
    const space = await this.spaceRepo.findOne({ where: { spaceId } });
    if (!space) throw new NotFoundException(`存储空间 ${spaceId} 不存在`);

    Object.assign(space, dto);
    return this.spaceRepo.save(space);
  }

  // ──────────────────────── Plans ────────────────────────

  async listPlans(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    return this.planRepo.find({ where, order: { tier: 'ASC' } });
  }

  async createPlan(dto: Partial<SubscriptionPlan> & { planId: string; name: string }) {
    const existing = await this.planRepo.findOne({ where: { planId: dto.planId } });
    if (existing) throw new ConflictException(`套餐 ${dto.planId} 已存在`);

    const plan = this.planRepo.create(dto as any);
    return this.planRepo.save(plan);
  }

  async updatePlan(planId: string, dto: Partial<SubscriptionPlan>) {
    const plan = await this.planRepo.findOne({ where: { planId } });
    if (!plan) throw new NotFoundException(`套餐 ${planId} 不存在`);

    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  // ──────────────────────── Orders ────────────────────────

  async listOrders(opts: {
    page?: number;
    pageSize?: number;
    tenantId?: string;
    paymentStatus?: string;
  }): Promise<PaginatedResult<SubscriptionOrder>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const where: FindOptionsWhere<SubscriptionOrder> = {};

    if (opts.tenantId) where.tenantId = opts.tenantId;
    if (opts.paymentStatus) where.paymentStatus = opts.paymentStatus as any;

    const [list, total] = await this.orderRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(list, total, page, pageSize);
  }

  async createOrder(
    dto: {
      tenantId: string;
      planId: string;
      orderType: 'new' | 'renewal' | 'upgrade' | 'downgrade' | 'gift';
      billingCycle: 'monthly' | 'yearly';
      amount: number;
      paymentMethod: string;
      validFrom?: Date;
      notes?: string;
    },
    createdBy: string,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`租户不存在`);

    const orderId = `ORD-${dayjs().format('YYYYMMDD')}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    const validFrom = dto.validFrom ?? new Date();
    const validTo =
      dto.billingCycle === 'yearly'
        ? dayjs(validFrom).add(1, 'year').toDate()
        : dayjs(validFrom).add(1, 'month').toDate();

    const order = this.orderRepo.create({
      ...dto,
      orderId,
      validFrom,
      validTo,
      paymentStatus: dto.paymentMethod === 'platform_gift' ? 'paid' : 'pending',
      paidAt: dto.paymentMethod === 'platform_gift' ? new Date() : null,
      paymentMethod: dto.paymentMethod as any,
      createdBy,
    });
    const saved = await this.orderRepo.save(order);

    // If paid (gift), activate tenant
    if (saved.paymentStatus === 'paid') {
      tenant.lifecycleStatus = 'active';
      tenant.status = 'active';
      tenant.currentPlanId = dto.planId;
      tenant.subscriptionExpiresAt = validTo;
      await this.tenantRepo.save(tenant);
    }

    return saved;
  }

  async confirmOrderPayment(orderId: string) {
    const order = await this.orderRepo.findOne({ where: { orderId } });
    if (!order) throw new NotFoundException(`订单 ${orderId} 不存在`);
    if (order.paymentStatus === 'paid') throw new BadRequestException('订单已支付');

    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    await this.orderRepo.save(order);

    // Activate tenant
    const tenant = await this.tenantRepo.findOne({ where: { id: order.tenantId } });
    if (tenant) {
      tenant.lifecycleStatus = 'active';
      tenant.status = 'active';
      tenant.currentPlanId = order.planId;
      tenant.subscriptionExpiresAt = order.validTo;
      await this.tenantRepo.save(tenant);
    }

    return order;
  }

  // ──────────────────────── Domain management ────────────────────────

  async addCustomDomain(tenantId: string, domain: string) {
    const existing = await this.domainRepo.findOne({ where: { domain } });
    if (existing) throw new ConflictException(`域名 ${domain} 已被占用`);

    const record = this.domainRepo.create({
      tenantId,
      domain,
      type: 'custom',
      status: 'pending',
      cnameTarget: 'cname.mdos.com',
      sslStatus: 'pending',
    });
    return this.domainRepo.save(record);
  }

  async listDomains(tenantId: string) {
    return this.domainRepo.find({ where: { tenantId } });
  }

  // ──────────────────────── Tenant plan change ────────────────────────

  async changeTenantPlan(
    tenantId: string,
    dto: {
      planId: string;
      changeType: 'upgrade' | 'downgrade' | 'renewal';
      billingCycle: 'monthly' | 'yearly';
      paymentMethod?: string;
      notes?: string;
    },
    createdBy: string,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`租户 ${tenantId} 不存在`);

    const plan = await this.planRepo.findOne({ where: { planId: dto.planId } });
    if (!plan) throw new NotFoundException(`套餐 ${dto.planId} 不存在`);

    // Calculate price
    const amount = dto.billingCycle === 'yearly'
      ? (plan.priceYearly ?? plan.priceMonthly * 10)
      : plan.priceMonthly;

    // Determine order type
    const orderType = dto.changeType === 'renewal' ? 'renewal'
      : dto.changeType === 'upgrade' ? 'upgrade' : 'downgrade';

    // Calculate valid dates
    const validFrom = new Date();
    const validTo = dto.billingCycle === 'yearly'
      ? dayjs().add(1, 'year').toDate()
      : dayjs().add(1, 'month').toDate();

    // For renewal, extend from current expiry
    const effectiveFrom = dto.changeType === 'renewal' && tenant.subscriptionExpiresAt
      ? new Date(tenant.subscriptionExpiresAt)
      : validFrom;
    const effectiveTo = dto.changeType === 'renewal' && tenant.subscriptionExpiresAt
      ? dayjs(tenant.subscriptionExpiresAt).add(dto.billingCycle === 'yearly' ? 1 : 1, dto.billingCycle === 'yearly' ? 'year' : 'month').toDate()
      : validTo;

    const orderId = `ORD-${dayjs().format('YYYYMMDD')}-${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    // Create order
    const order = this.orderRepo.create({
      orderId,
      tenantId,
      planId: dto.planId,
      orderType,
      billingCycle: dto.billingCycle,
      amount,
      paymentMethod: (dto.paymentMethod || 'platform_admin') as any,
      validFrom: effectiveFrom,
      validTo: effectiveTo,
      paymentStatus: 'paid', // Admin operations are auto-paid
      paidAt: new Date(),
      notes: dto.notes,
      createdBy,
    });
    await this.orderRepo.save(order);

    // Update tenant
    tenant.currentPlanId = dto.planId;
    tenant.subscriptionExpiresAt = effectiveTo;
    if (tenant.lifecycleStatus === 'trial') {
      tenant.lifecycleStatus = 'active';
    }
    tenant.status = 'active';
    await this.tenantRepo.save(tenant);

    return { order, tenant };
  }

  // ──────────────────────── Audit Logs (platform-wide) ────────────────────────

  async queryAuditLogs(opts: {
    module?: string;
    action?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PaginatedResult<AuditLog>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;

    const qb = this.auditLogRepo
      .createQueryBuilder('l')
      .orderBy('l.createdAt', 'DESC');

    if (opts.userId) qb.andWhere('l.userId = :userId', { userId: opts.userId });
    if (opts.module) qb.andWhere('l.module = :module', { module: opts.module });
    if (opts.action) qb.andWhere('l.action = :action', { action: opts.action });
    if (opts.startDate) qb.andWhere('l.createdAt >= :startDate', { startDate: opts.startDate });
    if (opts.endDate) qb.andWhere('l.createdAt <= :endDate', { endDate: opts.endDate });

    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return paginate(list, total, page, pageSize);
  }

  // ──────────────────────── Platform Admin Users ────────────────────────

  async listPlatformAdmins(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PaginatedResult<User>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;

    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.isPlatformAdmin = :isAdmin', { isAdmin: true })
      .orderBy('u.createdAt', 'DESC');

    if (opts.search) {
      qb.andWhere('(u.username ILIKE :q OR u.email ILIKE :q)', {
        q: `%${opts.search}%`,
      });
    }

    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();

    // Remove password from results
    const sanitized = list.map(u => {
      const { password, ...rest } = u as any;
      return rest;
    });

    return paginate(sanitized, total, page, pageSize);
  }

  async createPlatformAdmin(dto: {
    username: string;
    email: string;
    password: string;
    phone?: string;
  }) {
    const existingUser = await this.userRepo.findOne({
      where: [{ username: dto.username }, { email: dto.email }],
    });
    if (existingUser) {
      throw new ConflictException('用户名或邮箱已存在');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create a special tenant for platform admins
    const platformTenant = this.tenantRepo.create({
      name: 'Platform Admin',
      code: 'PLATFORM',
      slug: 'platform-admin',
      lifecycleStatus: 'active',
      status: 'active',
    });
    await this.tenantRepo.save(platformTenant);

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      phone: dto.phone,
      isPlatformAdmin: true,
      tenantId: platformTenant.id,
      status: 'active',
    } as any);
    await this.userRepo.save(user);

    const { password, ...result } = user as any;
    return result;
  }

  async updatePlatformAdmin(
    id: string,
    dto: {
      email?: string;
      phone?: string;
      status?: string;
    },
  ) {
    const user = await this.userRepo.findOne({
      where: { id, isPlatformAdmin: true },
    });
    if (!user) {
      throw new NotFoundException('平台管理员不存在');
    }

    if (dto.email) user.email = dto.email;
    if (dto.phone) user.phone = dto.phone;
    if (dto.status) user.status = dto.status as any;

    await this.userRepo.save(user);

    const { password, ...result } = user as any;
    return result;
  }

  async resetPlatformAdminPassword(id: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: { id, isPlatformAdmin: true },
    });
    if (!user) {
      throw new NotFoundException('平台管理员不存在');
    }

    (user as any).password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    return { success: true };
  }

  async deletePlatformAdmin(id: string) {
    const user = await this.userRepo.findOne({
      where: { id, isPlatformAdmin: true },
    });
    if (!user) {
      throw new NotFoundException('平台管理员不存在');
    }

    await this.userRepo.remove(user);
    return { success: true };
  }

  // ──────────────────────── System Config ────────────────────────

  async listSystemConfigs(category?: string): Promise<SystemConfig[]> {
    const where = category ? { category } : {};
    return this.configRepo.find({ where, order: { category: 'ASC', configKey: 'ASC' } });
  }

  async getSystemConfig(key: string): Promise<SystemConfig | null> {
    return this.configRepo.findOne({ where: { configKey: key } });
  }

  async setSystemConfig(dto: {
    configKey: string;
    configValue: string;
    category: string;
    description?: string;
    isPublic?: boolean;
  }) {
    const existing = await this.configRepo.findOne({ where: { configKey: dto.configKey } });

    if (existing) {
      existing.configValue = dto.configValue;
      existing.category = dto.category;
      if (dto.description) existing.description = dto.description;
      if (dto.isPublic !== undefined) existing.isPublic = dto.isPublic;
      return this.configRepo.save(existing);
    }

    const config = this.configRepo.create({
      configKey: dto.configKey,
      configValue: dto.configValue,
      category: dto.category,
      description: dto.description,
      isPublic: dto.isPublic ?? false,
    });
    return this.configRepo.save(config);
  }

  async deleteSystemConfig(key: string) {
    const config = await this.configRepo.findOne({ where: { configKey: key } });
    if (!config) {
      throw new NotFoundException(`配置 ${key} 不存在`);
    }
    await this.configRepo.remove(config);
    return { success: true };
  }

  // ──────────────────────── Tenant Migration ────────────────────────

  async migrateTenant(
    tenantId: string,
    targetSpaceId: string,
    options: {
      migrateData?: boolean;
      notes?: string;
    } = {},
    operatorId: string,
  ) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`租户 ${tenantId} 不存在`);
    }

    const sourceSpace = tenant.spaceId ? await this.spaceRepo.findOne({ where: { spaceId: tenant.spaceId } }) : null;
    const targetSpace = await this.spaceRepo.findOne({ where: { spaceId: targetSpaceId } });

    if (!targetSpace) {
      throw new NotFoundException(`目标存储空间 ${targetSpaceId} 不存在`);
    }

    if (targetSpace.status !== 'active') {
      throw new BadRequestException('目标存储空间不可用');
    }

    if (targetSpace.type === 'shared' && targetSpace.currentTenants >= targetSpace.maxTenants) {
      throw new BadRequestException('目标存储空间已满');
    }

    const oldSpaceId = tenant.spaceId;

    // Update tenant's space
    tenant.spaceId = targetSpaceId;
    await this.tenantRepo.save(tenant);

    // Update space counts
    if (oldSpaceId && oldSpaceId !== targetSpaceId) {
      await this.spaceRepo.increment({ spaceId: oldSpaceId } as any, 'currentTenants', -1);
    }
    await this.spaceRepo.increment({ spaceId: targetSpaceId } as any, 'currentTenants', 1);

    // Log the migration
    const orderId = `MIG-${dayjs().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return {
      success: true,
      tenantId,
      sourceSpaceId: oldSpaceId,
      targetSpaceId,
      migratedAt: new Date(),
      orderId,
    };
  }
}
