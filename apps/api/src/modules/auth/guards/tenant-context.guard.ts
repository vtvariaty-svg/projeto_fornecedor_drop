import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { TenantStatus } from "@prisma/client";
import { PrismaService } from "../../../common/prisma.service";
import { AuthenticatedUser } from "../../../common/types/authenticated-user.type";
import { TenantContext } from "../../../common/types/tenant-context.type";

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user: AuthenticatedUser;
      tenant?: TenantContext;
    }>();

    const tenantId = req.headers?.["x-tenant-id"] as string | undefined;
    const user = req.user;

    if (!tenantId) {
      throw new BadRequestException("Header X-Tenant-ID obrigatorio");
    }
    if (!user) {
      throw new UnauthorizedException();
    }

    const link = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      select: {
        isActive: true,
        role: true,
        tenant: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    if (!link || !link.isActive) {
      throw new ForbiddenException("Acesso negado ao tenant");
    }
    if (link.tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException("Tenant inativo");
    }

    req.tenant = { ...link.tenant, role: link.role };
    return true;
  }
}
