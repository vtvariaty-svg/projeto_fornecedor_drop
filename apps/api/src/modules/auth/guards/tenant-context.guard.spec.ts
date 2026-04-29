import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, BadRequestException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { TenantContextGuard } from "./tenant-context.guard";
import { PrismaService } from "../../../common/prisma.service";

const mockPrisma = {
  tenantUser: {
    findUnique: jest.fn(),
  },
};

function makeContext(headers: Record<string, string | undefined>, user?: unknown): ExecutionContext {
  const req = { headers, user, tenant: undefined as unknown };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

const validUser = { id: "user-1", email: "admin@drop.dev", role: "SUPER_ADMIN" };

const activeTenantLink = {
  isActive: true,
  role: "TENANT_ADMIN",
  tenant: { id: "tenant-1", name: "Loja Demo", slug: "loja-demo", status: "ACTIVE" },
};

describe("TenantContextGuard", () => {
  let guard: TenantContextGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextGuard,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<TenantContextGuard>(TenantContextGuard);
    jest.clearAllMocks();
  });

  it("rejeita quando X-Tenant-ID nao esta presente", async () => {
    const ctx = makeContext({}, validUser);

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it("rejeita quando usuario nao esta autenticado", async () => {
    const ctx = makeContext({ "x-tenant-id": "tenant-1" }, undefined);

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("rejeita quando usuario nao pertence ao tenant", async () => {
    mockPrisma.tenantUser.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ "x-tenant-id": "tenant-1" }, validUser);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("rejeita quando TenantUser esta inativo", async () => {
    mockPrisma.tenantUser.findUnique.mockResolvedValue({
      ...activeTenantLink,
      isActive: false,
    });
    const ctx = makeContext({ "x-tenant-id": "tenant-1" }, validUser);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("rejeita quando tenant esta inativo", async () => {
    mockPrisma.tenantUser.findUnique.mockResolvedValue({
      ...activeTenantLink,
      tenant: { ...activeTenantLink.tenant, status: "INACTIVE" },
    });
    const ctx = makeContext({ "x-tenant-id": "tenant-1" }, validUser);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it("retorna true e anexa tenant ao request quando tudo valido", async () => {
    mockPrisma.tenantUser.findUnique.mockResolvedValue(activeTenantLink);
    const req = { headers: { "x-tenant-id": "tenant-1" }, user: validUser, tenant: undefined as unknown };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.tenant).toEqual({
      id: "tenant-1",
      name: "Loja Demo",
      slug: "loja-demo",
      status: "ACTIVE",
      role: "TENANT_ADMIN",
    });
  });

  it("consulta o banco com o tenantId e userId corretos", async () => {
    mockPrisma.tenantUser.findUnique.mockResolvedValue(activeTenantLink);
    const ctx = makeContext({ "x-tenant-id": "tenant-1" }, validUser);

    await guard.canActivate(ctx);

    expect(mockPrisma.tenantUser.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_userId: { tenantId: "tenant-1", userId: validUser.id } },
      })
    );
  });
});
