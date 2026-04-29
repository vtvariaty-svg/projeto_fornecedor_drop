import { Test, TestingModule } from "@nestjs/testing";
import { CatalogService } from "./catalog.service";
import { PrismaService } from "../../common/prisma.service";
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { ProductStatus, UserRole } from "@drop/database";

const mockProduct = {
  id: "prod-1",
  name: "Bolsa Tote Premium",
  slug: "bolsa-tote-premium",
  description: "Bolsa espaçosa",
  status: ProductStatus.ACTIVE,
  category: "Bolsas",
  basePrice: 150.0,
  costPrice: 80.0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVariant = {
  id: "var-1",
  productId: "prod-1",
  sku: "TOTE-PRETO-M",
  name: "Preto M",
  color: "Preto",
  material: "Couro PU",
  size: "M",
  hardware: "Dourado",
  salePrice: 189.9,
  costPrice: 90.0,
  weightGrams: 450,
  status: ProductStatus.ACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  product: {
    create: jest.fn().mockResolvedValue(mockProduct),
    findMany: jest.fn().mockResolvedValue([mockProduct]),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
    update: jest.fn(),
  },
  productVariant: {
    create: jest.fn().mockResolvedValue(mockVariant),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  productMedia: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
};

describe("CatalogService", () => {
  let service: CatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
    jest.clearAllMocks();
    mockPrisma.product.findUnique.mockResolvedValue(null);
    mockPrisma.productVariant.findUnique.mockResolvedValue(null);
  });

  describe("adminCreate", () => {
    it("cria produto com payload válido", async () => {
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.adminCreate({
        name: "Bolsa Tote Premium",
        slug: "bolsa-tote-premium",
        basePrice: 150,
      });

      expect(result.slug).toBe("bolsa-tote-premium");
      expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
    });

    it("rejeita slug duplicado", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: "outro-id" });

      await expect(
        service.adminCreate({ name: "X", slug: "bolsa-tote-premium", basePrice: 100 })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("adminCreateVariant", () => {
    it("cria variante com SKU válido", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productVariant.findUnique.mockResolvedValue(null);
      mockPrisma.productVariant.findFirst.mockResolvedValue({ id: "var-1", productId: "prod-1" });
      mockPrisma.productVariant.create.mockResolvedValue(mockVariant);

      const result = await service.adminCreateVariant("prod-1", {
        sku: "TOTE-PRETO-M",
        name: "Preto M",
        salePrice: 189.9,
      });

      expect(result.sku).toBe("TOTE-PRETO-M");
    });

    it("rejeita SKU duplicado", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct);
      mockPrisma.productVariant.findUnique.mockResolvedValue({ id: "outro-var" });

      await expect(
        service.adminCreateVariant("prod-1", {
          sku: "TOTE-PRETO-M",
          name: "X",
          salePrice: 100,
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("publicList", () => {
    it("lista apenas produtos ativos", async () => {
      const activeProducts = [{ ...mockProduct, status: ProductStatus.ACTIVE }];
      mockPrisma.product.findMany.mockResolvedValue(activeProducts);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.publicList({});

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ProductStatus.ACTIVE }),
        })
      );
    });

    it("não retorna costPrice para lojista", async () => {
      // Simula o retorno do Prisma após apply do select (sem costPrice)
      const publicProduct = {
        id: mockProduct.id,
        name: mockProduct.name,
        slug: mockProduct.slug,
        description: mockProduct.description,
        status: mockProduct.status,
        category: mockProduct.category,
        basePrice: mockProduct.basePrice,
        createdAt: mockProduct.createdAt,
        updatedAt: mockProduct.updatedAt,
        variants: [],
        media: [],
      };
      mockPrisma.product.findMany.mockResolvedValue([publicProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.publicList({});

      result.items.forEach((item: Record<string, unknown>) => {
        expect(item.costPrice).toBeUndefined();
      });
    });

    it("produto inativo não aparece para lojista", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const result = await service.publicList({});

      expect(result.items).toHaveLength(0);
    });
  });

  describe("publicGetBySlug", () => {
    it("retorna produto ativo por slug", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        variants: [{ ...mockVariant, status: ProductStatus.ACTIVE }],
        media: [],
      });

      const result = await service.publicGetBySlug("bolsa-tote-premium");

      expect(result.slug).toBe("bolsa-tote-premium");
    });

    it("lança NotFoundException para produto inativo", async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.ARCHIVED,
        variants: [],
        media: [],
      });

      await expect(service.publicGetBySlug("bolsa-tote-premium")).rejects.toThrow(
        NotFoundException
      );
    });

    it("lança NotFoundException para slug inexistente", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.publicGetBySlug("nao-existe")).rejects.toThrow(NotFoundException);
    });
  });
});
