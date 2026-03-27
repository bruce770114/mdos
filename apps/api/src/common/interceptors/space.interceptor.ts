import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { SpaceRouterService, TenantSpaceInfo } from '../services/space-router.service';

@Injectable()
export class SpaceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SpaceInterceptor.name);

  constructor(private readonly spaceRouter: SpaceRouterService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    // 只有当请求带有有效 tenantId 时才解析 Space
    const tenantId = request.user?.tenantId || request.tenantId;

    if (!tenantId) {
      // 无 tenantId（公开路由），跳过 Space 解析
      return next.handle();
    }

    // 同步解析 Space（不阻塞请求）
    this.resolveSpaceSync(tenantId, request);

    return next.handle();
  }

  private resolveSpaceSync(tenantId: string, request: any): void {
    // 同步方式尝试解析，使用缓存
    this.spaceRouter
      .resolve(tenantId)
      .then((spaceInfo) => {
        // 将 Space 信息注入请求对象
        request.tenantSpace = spaceInfo;
        request.tenantId = tenantId;
        request.schemaName = spaceInfo.schemaName;

        this.logger.debug(
          `Space resolved: tenant=${tenantId}, space=${spaceInfo.spaceId}, schema=${spaceInfo.schemaName}`,
        );
      })
      .catch((err) => {
        if (err instanceof NotFoundException) {
          this.logger.warn(
            `Tenant ${tenantId} has no space assigned. This is expected for tenants without space.`,
          );
        } else {
          this.logger.error(`Space resolution failed for tenant ${tenantId}: ${err.message}`);
        }
        // 不阻止请求继续
      });
  }
}
