import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * 获取当前租户信息的装饰器
 *
 * 使用方式:
 * ```typescript
 * @Controller('units')
 * export class UnitsController {
 *   @Get()
 *   findAll(@CurrentTenant() tenantSpace: TenantSpaceInfo) {
 *     // tenantSpace 包含 { tenantId, spaceId, schemaName, ... }
 *     return this.unitsService.findAll(tenantSpace);
 *   }
 * }
 * ```
 *
 * 需要配合 SpaceInterceptor 使用，拦截器会自动解析并注入 tenantSpace
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (request.tenantSpace) {
      return request.tenantSpace;
    }

    if (request.tenantId) {
      // 如果只有 tenantId，返回 tenantId
      // 业务代码可以使用 SpaceRouterService 进一步解析
      return { tenantId: request.tenantId };
    }

    throw new BadRequestException('No tenant information found in request');
  },
);

/**
 * 获取当前租户 ID 的装饰器
 *
 * 使用方式:
 * ```typescript
 * @Get(':id')
 * findOne(@CurrentTenantId() tenantId: string, @Param('id') id: string) {
 *   return this.service.findOne(tenantId, id);
 * }
 * ```
 */
export const CurrentTenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return request.tenantId || request.user?.tenantId;
  },
);
