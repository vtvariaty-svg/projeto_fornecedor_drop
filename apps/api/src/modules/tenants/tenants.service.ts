import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { TenantStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { AttachUserToTenantDto } from "./dto/attach-user-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Método existente — mantido para compatibilidade ─────────────────────

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

  // ─── Métodos administrativos ──────────────────────────────────────────────

  async adminListTenants(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { users: true } },
        },
      }),
      this.prisma.tenant.count(),
    ]);
    return {
      items: items.map((t) => ({ ...t, userCount: t._count.users })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async adminCreateTenant(dto: CreateTenantDto) {
    const exists = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug },
    });
    if (exists) {
      throw new ConflictException(`Slug '${dto.slug}' já está em uso`);
    }
    return this.prisma.tenant.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        status: dto.status ?? TenantStatus.ACTIVE,
      },
    });
  }

  async adminAttachUserToTenant(tenantId: string, dto: AttachUserToTenantDto) {
    if (!dto.userId && !dto.email) {
      throw new BadRequestException("Informe userId ou email");
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException("Tenant não encontrado");

    const user = dto.userId
      ? await this.prisma.user.findUnique({ where: { id: dto.userId } })
      : await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) throw new NotFoundException("Usuário não encontrado");

    const role = dto.role ?? UserRole.TENANT_MEMBER;

    const link = await this.prisma.tenantUser.upsert({
      where: { tenantId_userId: { tenantId, userId: user.id } },
      update: { role, isActive: true },
      create: { tenantId, userId: user.id, role, isActive: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, status: true } },
      },
    });

    return { ...link.tenant, role: link.role };
  }

  // ─── Bootstrap — idempotente ──────────────────────────────────────────────
  // Cria ou reutiliza um tenant inicial para o SUPER_ADMIN que ainda não tem vínculo.
  // Pode ser chamado múltiplas vezes sem efeito colateral.

  async bootstrapCurrentSuperAdminTenant(userId: string) {
    // Se já tem vínculo ativo, retorna o primeiro tenant
    const existing = await this.findForUser(userId);
    if (existing.length > 0) {
      return existing[0];
    }

    // Tenta reutilizar tenant com slug "operacao-principal"
    const BOOTSTRAP_SLUG = "operacao-principal";
    let tenant = await this.prisma.tenant.findUnique({ where: { slug: BOOTSTRAP_SLUG } });

    if (!tenant) {
      tenant = await this.prisma.tenant.create({
        data: {
          name: "Operação Principal",
          slug: BOOTSTRAP_SLUG,
          status: TenantStatus.ACTIVE,
        },
      });
    }

    // Vincula o usuário como TENANT_ADMIN
    await this.prisma.tenantUser.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId } },
      update: { isActive: true, role: UserRole.TENANT_ADMIN },
      create: { tenantId: tenant.id, userId, role: UserRole.TENANT_ADMIN, isActive: true },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      role: UserRole.TENANT_ADMIN,
    };
  }
}
