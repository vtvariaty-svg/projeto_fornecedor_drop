import { Injectable, ForbiddenException } from "@nestjs/common";
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
    });
    if (!link || !link.isActive) {
      throw new ForbiddenException("Acesso negado ao tenant");
    }
    return link;
  }
}
