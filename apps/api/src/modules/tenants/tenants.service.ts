import { Injectable, ForbiddenException } from "@nestjs/common";
import { TenantStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(userId: string) {
    const links = await this.prisma.tenantUser.findMany({
      where: { userId, isActive: true },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });
    return links.map((l) => ({ ...l.tenant, role: l.role }));
  }

  async assertUserInTenant(userId: string, tenantId: string) {
    const link = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
      },
    });
    if (!link || !link.isActive) {
      throw new ForbiddenException("Acesso negado ao tenant");
    }
    if (link.tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException("Tenant inativo");
    }
    return link;
  }
}
