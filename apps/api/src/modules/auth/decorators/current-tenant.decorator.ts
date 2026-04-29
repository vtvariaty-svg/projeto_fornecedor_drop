import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { TenantContext } from "../../../common/types/tenant-context.type";

// Retorna o tenant validado pelo TenantContextGuard (id, name, slug, status, role).
// Requer que TenantContextGuard seja aplicado na rota antes deste decorator.
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const req = ctx.switchToHttp().getRequest<{ tenant: TenantContext }>();
    return req.tenant;
  }
);
