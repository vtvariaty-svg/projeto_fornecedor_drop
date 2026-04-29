import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma.service";
import { UnauthorizedException, ForbiddenException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";

const mockUser = {
  id: "user-1",
  email: "admin@drop.dev",
  name: "Admin",
  role: "SUPER_ADMIN" as const,
  passwordHash: "",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  refreshToken: {
    create: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  tenantUser: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

const mockUsers = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue("access-token"),
  verify: jest.fn(),
};

const mockConfig = {
  getOrThrow: jest.fn().mockReturnValue("secret"),
  get: jest.fn().mockReturnValue("15m"),
};

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UsersService, useValue: mockUsers },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockConfig.getOrThrow.mockReturnValue("secret");
    mockConfig.get.mockReturnValue("15m");
    mockPrisma.refreshToken.create.mockResolvedValue({});
    mockPrisma.refreshToken.update.mockResolvedValue({});
    mockPrisma.tenantUser.findMany.mockResolvedValue([]);
    mockJwt.sign.mockReturnValue("access-token");
  });

  describe("login", () => {
    it("retorna tokens e dados do usuario com credenciais corretas", async () => {
      const hash = await bcrypt.hash("Admin@123", 10);
      mockUsers.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.login({ email: mockUser.email, password: "Admin@123" });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(mockUser.email);
    });

    it("nao retorna passwordHash no resultado", async () => {
      const hash = await bcrypt.hash("Admin@123", 10);
      mockUsers.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.login({ email: mockUser.email, password: "Admin@123" });

      expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
    });

    it("rejeita senha incorreta", async () => {
      const hash = await bcrypt.hash("Admin@123", 10);
      mockUsers.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(
        service.login({ email: mockUser.email, password: "wrong" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejeita usuario inexistente", async () => {
      mockUsers.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: "notfound@test.com", password: "any" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("rejeita usuario inativo", async () => {
      const hash = await bcrypt.hash("Admin@123", 10);
      mockUsers.findByEmail.mockResolvedValue({ ...mockUser, passwordHash: hash, isActive: false });

      await expect(
        service.login({ email: mockUser.email, password: "Admin@123" })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("refresh", () => {
    const futureDate = new Date(Date.now() + 86400000);
    const pastDate = new Date(Date.now() - 1000);

    const storedToken = {
      id: "rt-1",
      tokenHash: "hashed-token",
      revokedAt: null,
      expiresAt: futureDate,
      user: {
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        isActive: true,
      },
    };

    it("retorna novo par de tokens com token valido", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);

      const result = await service.refresh("raw-valid-token");

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it("revoga o token antigo apos rotacao", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);

      await service.refresh("raw-valid-token");

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: storedToken.id },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        })
      );
    });

    it("emite novo refreshToken via create apos rotacao", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);

      await service.refresh("raw-valid-token");

      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });

    it("rejeita token inexistente", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh("unknown-token")).rejects.toThrow(UnauthorizedException);
    });

    it("rejeita token ja revogado", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
      });

      await expect(service.refresh("revoked-token")).rejects.toThrow(UnauthorizedException);
    });

    it("rejeita token expirado", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        expiresAt: pastDate,
      });

      await expect(service.refresh("expired-token")).rejects.toThrow(UnauthorizedException);
    });

    it("rejeita token de usuario inativo", async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        ...storedToken,
        user: { ...storedToken.user, isActive: false },
      });

      await expect(service.refresh("inactive-user-token")).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("me", () => {
    it("retorna apenas tenants vinculados ao usuario", async () => {
      mockUsers.findById.mockResolvedValue(mockUser);
      mockPrisma.tenantUser.findMany.mockResolvedValue([
        {
          role: "TENANT_ADMIN",
          tenant: { id: "t1", name: "Loja Demo", slug: "loja-demo", status: "ACTIVE" },
        },
      ]);

      const result = await service.me({ id: mockUser.id, email: mockUser.email, role: mockUser.role });

      expect(result.tenants).toHaveLength(1);
      expect(result.tenants[0].slug).toBe("loja-demo");
    });

    it("rejeita usuario inativo", async () => {
      mockUsers.findById.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(
        service.me({ id: mockUser.id, email: mockUser.email, role: mockUser.role })
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
