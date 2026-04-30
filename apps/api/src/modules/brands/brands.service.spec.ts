import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { BrandsService } from "./brands.service";
import { PrismaService } from "../../common/prisma.service";
import { BrandStatus, AssetType } from "@prisma/client";

const TENANT_ID = "tenant-1";
const OTHER_TENANT = "tenant-2";
const BRAND_ID = "brand-1";
const ASSET_ID = "asset-1";

const mockBrand = {
  id: BRAND_ID,
  name: "Minha Marca",
  slug: "minha-marca",
  description: null,
  status: BrandStatus.DRAFT,
  primaryColor: null,
  secondaryColor: null,
  accentColor: null,
  toneOfVoice: null,
  brandStory: null,
  guidelines: null,
  approvedAt: null,
  rejectedReason: null,
  tenantId: TENANT_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAsset = {
  id: ASSET_ID,
  type: AssetType.LOGO,
  url: "https://example.com/logo.png",
  filename: "logo.png",
  mimeType: "image/png",
  storageKey: null,
  altText: null,
  sortOrder: 0,
  isApproved: false,
  notes: null,
  brandId: BRAND_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makePrisma() {
  return {
    brand: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([mockBrand]),
      count: jest.fn().mockResolvedValue(1),
      create: jest.fn().mockResolvedValue(mockBrand),
      update: jest.fn().mockResolvedValue(mockBrand),
    },
    brandAsset: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([mockAsset]),
      create: jest.fn().mockResolvedValue(mockAsset),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
}

describe("BrandsService", () => {
  let service: BrandsService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(async () => {
    prisma = makePrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  // -- create --

  describe("create", () => {
    it("cria marca dentro do tenant autenticado", async () => {
      prisma.brand.findUnique.mockResolvedValue(null);
      prisma.brand.create.mockResolvedValue(mockBrand);

      const result = await service.create(TENANT_ID, {
        name: "Minha Marca",
        slug: "minha-marca",
      });

      expect(prisma.brand.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: TENANT_ID, slug: "minha-marca" }),
        })
      );
      expect(result.tenantId).toBe(TENANT_ID);
    });

    it("rejeita slug duplicado com ConflictException", async () => {
      prisma.brand.findUnique.mockResolvedValue(mockBrand);

      await expect(
        service.create(TENANT_ID, { name: "Outra", slug: "minha-marca" })
      ).rejects.toThrow(ConflictException);
    });
  });

  // -- list --

  describe("list", () => {
    it("lista apenas marcas do tenant autenticado", async () => {
      await service.list(TENANT_ID, {});

      expect(prisma.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        })
      );
    });

    it("suporta filtro por status", async () => {
      await service.list(TENANT_ID, { status: BrandStatus.ACTIVE });

      expect(prisma.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: BrandStatus.ACTIVE }),
        })
      );
    });
  });

  // -- findOne --

  describe("findOne", () => {
    it("retorna marca do tenant autenticado com assets", async () => {
      prisma.brand.findUnique.mockResolvedValue({ ...mockBrand, assets: [mockAsset] });

      const result = await service.findOne(TENANT_ID, BRAND_ID);
      expect(result.id).toBe(BRAND_ID);
    });

    it("rejeita acesso a marca de outro tenant com ForbiddenException", async () => {
      prisma.brand.findUnique.mockResolvedValue({ ...mockBrand, tenantId: OTHER_TENANT, assets: [] });

      await expect(service.findOne(TENANT_ID, BRAND_ID)).rejects.toThrow(ForbiddenException);
    });

    it("lanca NotFoundException para marca inexistente", async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await expect(service.findOne(TENANT_ID, "id-inexistente")).rejects.toThrow(NotFoundException);
    });
  });

  // -- archive --

  describe("archive", () => {
    it("arquiva marca sem delete fisico (status ARCHIVED)", async () => {
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.brand.update.mockResolvedValue({ ...mockBrand, status: BrandStatus.ARCHIVED });

      const result = await service.archive(TENANT_ID, BRAND_ID);

      expect(prisma.brand.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: BrandStatus.ARCHIVED },
        })
      );
      expect(result.status).toBe(BrandStatus.ARCHIVED);
    });

    it("rejeita arquivamento de marca de outro tenant", async () => {
      prisma.brand.findUnique.mockResolvedValue({ ...mockBrand, tenantId: OTHER_TENANT });

      await expect(service.archive(TENANT_ID, BRAND_ID)).rejects.toThrow(ForbiddenException);
    });
  });

  // -- addAsset --

  describe("addAsset", () => {
    const assetDto = {
      type: AssetType.LOGO,
      url: "https://example.com/logo.png",
      filename: "logo.png",
      mimeType: "image/png",
    };

    it("cria asset por URL vinculado a marca do tenant", async () => {
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.brandAsset.create.mockResolvedValue(mockAsset);

      const result = await service.addAsset(TENANT_ID, BRAND_ID, assetDto);

      expect(prisma.brandAsset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ brandId: BRAND_ID, url: assetDto.url }),
        })
      );
      expect(result.brandId).toBe(BRAND_ID);
    });

    it("rejeita asset em marca de outro tenant", async () => {
      prisma.brand.findUnique.mockResolvedValue({ ...mockBrand, tenantId: OTHER_TENANT });

      await expect(
        service.addAsset(TENANT_ID, BRAND_ID, assetDto)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // -- removeAsset --

  describe("removeAsset", () => {
    it("remove asset da marca do tenant", async () => {
      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.brandAsset.findUnique.mockResolvedValue(mockAsset);

      const result = await service.removeAsset(TENANT_ID, BRAND_ID, ASSET_ID);
      expect(result.ok).toBe(true);
      expect(prisma.brandAsset.delete).toHaveBeenCalledWith({ where: { id: ASSET_ID } });
    });

    it("rejeita remocao de asset de marca de outro tenant", async () => {
      prisma.brand.findUnique.mockResolvedValue({ ...mockBrand, tenantId: OTHER_TENANT });

      await expect(
        service.removeAsset(TENANT_ID, BRAND_ID, ASSET_ID)
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // -- adminList --

  describe("adminList", () => {
    it("lista marcas de todos os tenants sem filtro de tenant", async () => {
      await service.adminList({});

      expect(prisma.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ tenantId: TENANT_ID }),
        })
      );
    });

    it("filtra por tenantId quando informado", async () => {
      await service.adminList({ tenantId: TENANT_ID });

      expect(prisma.brand.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        })
      );
    });
  });
});
