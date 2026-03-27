import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { join } from 'path';

// Load env manually without dotenv dependency
import { readFileSync } from 'fs';
function loadEnv(path: string) {
  try {
    const content = readFileSync(path, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    });
  } catch { /* file not found, use defaults */ }
}
loadEnv(join(__dirname, '../../.env'));

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'mdos',
  password: process.env.DB_PASSWORD || 'mdos_pass_2024',
  database: process.env.DB_DATABASE || 'mdos_db',
  entities: [join(__dirname, '../**/*.entity.ts')],
  synchronize: true,
  logging: false,
});

async function seed() {
  console.log('🌱 Starting database seed...');

  await AppDataSource.initialize();
  console.log('✅ Database connected');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 1. Create demo tenant
    const existingTenant = await queryRunner.query(
      `SELECT id FROM tenants WHERE code = 'DEMO' LIMIT 1`,
    );

    let tenantId: string;
    if (existingTenant.length > 0) {
      tenantId = existingTenant[0].id;
      console.log('ℹ️  Demo tenant already exists, skipping...');
    } else {
      const tenantResult = await queryRunner.query(
        `INSERT INTO tenants (id, name, code, slug, sub_domain, status, lifecycle_status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), '演示企业', 'DEMO', 'demo', 'demo.mdos.com', 'active', 'active', NOW(), NOW())
         RETURNING id`,
      );
      tenantId = tenantResult[0].id;
      console.log(`✅ Created tenant: 演示企业 (${tenantId})`);
    }

    // 2. Seed default permissions
    const permissionDefs = [
      // Users
      { module: 'users', action: 'read', resource: 'user' },
      { module: 'users', action: 'create', resource: 'user' },
      { module: 'users', action: 'update', resource: 'user' },
      { module: 'users', action: 'delete', resource: 'user' },
      // Roles
      { module: 'roles', action: 'read', resource: 'role' },
      { module: 'roles', action: 'create', resource: 'role' },
      { module: 'roles', action: 'update', resource: 'role' },
      { module: 'roles', action: 'delete', resource: 'role' },
      // Units
      { module: 'units', action: 'read', resource: 'unit' },
      { module: 'units', action: 'create', resource: 'unit' },
      { module: 'units', action: 'update', resource: 'unit' },
      { module: 'units', action: 'delete', resource: 'unit' },
      // Customers
      { module: 'customers', action: 'read', resource: 'customer' },
      { module: 'customers', action: 'create', resource: 'customer' },
      { module: 'customers', action: 'update', resource: 'customer' },
      { module: 'customers', action: 'delete', resource: 'customer' },
      // Contracts
      { module: 'contracts', action: 'read', resource: 'contract' },
      { module: 'contracts', action: 'create', resource: 'contract' },
      { module: 'contracts', action: 'update', resource: 'contract' },
      { module: 'contracts', action: 'delete', resource: 'contract' },
      { module: 'contracts', action: 'approve', resource: 'contract' },
      // Billing
      { module: 'billing', action: 'read', resource: 'bill' },
      { module: 'billing', action: 'create', resource: 'bill' },
      { module: 'billing', action: 'update', resource: 'bill' },
      { module: 'billing', action: 'export', resource: 'bill' },
      // Financial
      { module: 'financial', action: 'read', resource: 'finance' },
      { module: 'financial', action: 'create', resource: 'finance' },
      { module: 'financial', action: 'export', resource: 'finance' },
      // Settings
      { module: 'settings', action: 'read', resource: 'setting' },
      { module: 'settings', action: 'update', resource: 'setting' },
    ];

    const existingPerms = await queryRunner.query(
      `SELECT COUNT(*) FROM permissions`,
    );
    if (parseInt(existingPerms[0].count) === 0) {
      for (const perm of permissionDefs) {
        await queryRunner.query(
          `INSERT INTO permissions (id, module, action, resource, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
          [perm.module, perm.action, perm.resource],
        );
      }
      console.log(`✅ Created ${permissionDefs.length} permissions`);
    }

    const allPerms = await queryRunner.query(`SELECT id, module, action FROM permissions`);
    const permMap = new Map(allPerms.map((p: { id: string; module: string; action: string }) => [`${p.module}:${p.action}`, p.id]));

    // 3. Create default roles
    const roleDefs = [
      {
        name: '超级管理员',
        code: 'super_admin',
        description: '拥有所有权限',
        isSystem: true,
        permissions: permissionDefs.map((p) => `${p.module}:${p.action}`),
      },
      {
        name: '运营经理',
        code: 'operation_manager',
        description: '运营监控与管理',
        isSystem: true,
        permissions: [
          'units:read', 'customers:read', 'contracts:read', 'contracts:update',
          'billing:read', 'financial:read', 'financial:export', 'settings:read',
        ],
      },
      {
        name: '招商经理',
        code: 'leasing_manager',
        description: '招商与合同管理',
        isSystem: true,
        permissions: [
          'units:read', 'units:update',
          'customers:read', 'customers:create', 'customers:update',
          'contracts:read', 'contracts:create', 'contracts:update',
          'billing:read',
        ],
      },
      {
        name: '财务人员',
        code: 'financial_staff',
        description: '账务与财务管理',
        isSystem: true,
        permissions: [
          'units:read', 'customers:read', 'contracts:read',
          'billing:read', 'billing:create', 'billing:update', 'billing:export',
          'financial:read', 'financial:create', 'financial:export',
        ],
      },
      {
        name: '只读用户',
        code: 'readonly',
        description: '只可查看数据',
        isSystem: true,
        permissions: [
          'units:read', 'customers:read', 'contracts:read',
          'billing:read', 'financial:read',
        ],
      },
    ];

    for (const roleDef of roleDefs) {
      const existing = await queryRunner.query(
        `SELECT id FROM roles WHERE tenant_id = $1 AND code = $2 LIMIT 1`,
        [tenantId, roleDef.code],
      );

      let roleId: string;
      if (existing.length > 0) {
        roleId = existing[0].id;
      } else {
        const result = await queryRunner.query(
          `INSERT INTO roles (id, tenant_id, name, code, description, is_system, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
           RETURNING id`,
          [tenantId, roleDef.name, roleDef.code, roleDef.description, roleDef.isSystem],
        );
        roleId = result[0].id;
        console.log(`✅ Created role: ${roleDef.name}`);

        // Assign permissions
        for (const permKey of roleDef.permissions) {
          const permId = permMap.get(permKey);
          if (permId) {
            await queryRunner.query(
              `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [roleId, permId],
            );
          }
        }
      }

      // Store super_admin role id for user creation
      if (roleDef.code === 'super_admin') {
        // Create admin user
        const existingUser = await queryRunner.query(
          `SELECT id FROM users WHERE tenant_id = $1 AND username = 'admin' LIMIT 1`,
          [tenantId],
        );

        if (existingUser.length === 0) {
          const passwordHash = await bcrypt.hash('Admin@123', 12);
          const userResult = await queryRunner.query(
            `INSERT INTO users (id, tenant_id, username, email, phone, password_hash, status, is_platform_admin, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, 'admin', 'admin@demo.com', '13800000000', $2, 'active', true, NOW(), NOW())
             RETURNING id`,
            [tenantId, passwordHash],
          );
          const userId = userResult[0].id;

          await queryRunner.query(
            `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [userId, roleId],
          );
          console.log(`✅ Created admin user: admin / Admin@123`);
        }
      }
    }

    // 4. Create demo project and units
    const existingProject = await queryRunner.query(
      `SELECT id FROM projects WHERE "tenantId" = $1 AND name = '演示广场' LIMIT 1`,
      [tenantId],
    );

    if (existingProject.length === 0) {
      const projectResult = await queryRunner.query(
        `INSERT INTO projects (id, "tenantId", name, address, city, lat, lng, "totalArea", status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, '演示广场', '北京市朝阳区建国路88号', '北京', 39.9200, 116.4700, 50000, 'active', NOW(), NOW())
         RETURNING id`,
        [tenantId],
      );
      const projectId = projectResult[0].id;

      const buildingResult = await queryRunner.query(
        `INSERT INTO buildings (id, "tenantId", "projectId", name, "floorCount", "totalArea", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'A座', 20, 30000, NOW(), NOW())
         RETURNING id`,
        [tenantId, projectId],
      );
      const buildingId = buildingResult[0].id;

      // Create floors 1-3 with sample units
      for (let floorNo = 1; floorNo <= 3; floorNo++) {
        const floorResult = await queryRunner.query(
          `INSERT INTO floors (id, "tenantId", "buildingId", "floorNo", "floorName", "totalArea", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 1200, NOW(), NOW())
           RETURNING id`,
          [tenantId, buildingId, floorNo, `${floorNo}F`],
        );
        const floorId = floorResult[0].id;

        // Create 4 units per floor
        const unitStatuses = ['vacant', 'rented', 'rented', 'reserved'];
        for (let i = 1; i <= 4; i++) {
          await queryRunner.query(
            `INSERT INTO units (id, "tenantId", "floorId", "unitNo", area, "areaUsable", "unitType", status, "createdAt", "updatedAt")
             VALUES (gen_random_uuid(), $1, $2, $3, 300, 270, 'office', $4, NOW(), NOW())`,
            [tenantId, floorId, `A${floorNo}0${i}`, unitStatuses[i - 1]],
          );
        }
      }
      console.log(`✅ Created demo project: 演示广场 (3 floors, 12 units)`);
    }

    // 5. Create demo customers
    const existingCustomer = await queryRunner.query(
      `SELECT id FROM customers WHERE "tenantId" = $1 LIMIT 1`,
      [tenantId],
    );

    if (existingCustomer.length === 0) {
      const customers = [
        { companyName: '北京科技有限公司', creditCode: '91110000XXXXXXXX01', contactName: '张三', phone: '13900000001', email: 'zhangsan@tech.com', grade: 'A' },
        { companyName: '上海贸易集团', creditCode: '91310000XXXXXXXX02', contactName: '李四', phone: '13900000002', email: 'lisi@trade.com', grade: 'B' },
        { companyName: '广州餐饮管理有限公司', creditCode: '91440000XXXXXXXX03', contactName: '王五', phone: '13900000003', email: 'wangwu@food.com', grade: 'A' },
      ];

      for (const customer of customers) {
        await queryRunner.query(
          `INSERT INTO customers (id, "tenantId", "companyName", "creditCode", "contactName", phone, email, grade, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [tenantId, customer.companyName, customer.creditCode, customer.contactName, customer.phone, customer.email, customer.grade],
        );
      }
      console.log(`✅ Created 3 demo customers`);
    }

    // 6. Init default system settings
    // 6a. Platform: default subscription plans
    const planCount = await queryRunner.query(`SELECT COUNT(*) FROM subscription_plans`);
    if (parseInt(planCount[0].count) === 0) {
      const plans = [
        { planId: 'plan_trial', name: '试用版', tier: 'trial', priceMonthly: 0, priceYearly: 0, maxUsers: 3, maxProjects: 1, storageGB: 5, trialDays: 14 },
        { planId: 'plan_standard', name: '标准版', tier: 'standard', priceMonthly: 999, priceYearly: 9999, maxUsers: 10, maxProjects: 5, storageGB: 50, trialDays: 0 },
        { planId: 'plan_professional', name: '专业版', tier: 'professional', priceMonthly: 2999, priceYearly: 29999, maxUsers: 30, maxProjects: 20, storageGB: 200, trialDays: 0 },
        { planId: 'plan_enterprise', name: '旗舰版', tier: 'enterprise', priceMonthly: 0, priceYearly: 0, maxUsers: -1, maxProjects: -1, storageGB: -1, trialDays: 0 },
      ];
      for (const p of plans) {
        await queryRunner.query(
          `INSERT INTO subscription_plans (id, plan_id, name, tier, price_monthly, price_yearly, max_users, max_projects, storage_gb, trial_days, is_active, "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())`,
          [p.planId, p.name, p.tier, p.priceMonthly, p.priceYearly, p.maxUsers, p.maxProjects, p.storageGB, p.trialDays],
        );
      }
      console.log(`✅ Created 4 default subscription plans`);
    }

    // 6b. Platform: default shared space
    const spaceCount = await queryRunner.query(`SELECT COUNT(*) FROM spaces`);
    if (parseInt(spaceCount[0].count) === 0) {
      await queryRunner.query(
        `INSERT INTO spaces (id, space_id, name, type, db_instance, schema_name, region, max_tenants, current_tenants, storage_used_gb, storage_limit_gb, status, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'space_cn_shared_01', '华东共享池-01', 'shared', 'db-instance-cn-east-01', 'space_cn_shared_01', '华东（上海）', 50, 0, 0, 500, 'active', NOW(), NOW())`,
      );
      console.log(`✅ Created default shared space: space_cn_shared_01`);
    }

    // 6c. Platform admin user (special account not tied to tenant business)
    const existingPlatformAdmin = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'platform@mdos.com' AND is_platform_admin = true LIMIT 1`,
    );
    if (existingPlatformAdmin.length === 0) {
      const platformAdminHash = await bcrypt.hash('Platform@123', 12);
      await queryRunner.query(
        `INSERT INTO users (id, tenant_id, username, email, password_hash, status, is_platform_admin, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, 'platform_admin', 'platform@mdos.com', $2, 'active', true, NOW(), NOW())`,
        [tenantId, platformAdminHash],
      );
      console.log(`✅ Created platform admin: platform@mdos.com / Platform@123`);
    }

    const settingsDefaults = [
      { category: 'general', key: 'companyName', value: '"演示企业"' },
      { category: 'general', key: 'currency', value: '"CNY"' },
      { category: 'lease', key: 'contractExpiryReminders', value: '[30, 60, 90]' },
      { category: 'billing', key: 'billGenerationDay', value: '1' },
      { category: 'notification', key: 'emailEnabled', value: 'false' },
    ];

    for (const setting of settingsDefaults) {
      await queryRunner.query(
        `INSERT INTO system_settings (id, "tenantId", category, key, value, "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4::jsonb, NOW(), NOW())
         ON CONFLICT ("tenantId", category, key) DO NOTHING`,
        [tenantId, setting.category, setting.key, setting.value],
      );
    }
    console.log(`✅ Created default system settings`);

    await queryRunner.commitTransaction();
    console.log('\n🎉 Database seeded successfully!');
    console.log('📋 Demo credentials:');
    console.log('   Tenant code: DEMO');
    console.log('   Username: admin');
    console.log('   Password: Admin@123');
    console.log('   Platform admin: platform@mdos.com / Platform@123');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed().catch(console.error);
