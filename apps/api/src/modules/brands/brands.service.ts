import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { BrandStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { CreateBrandAssetDto } from "./dto/create-brand-asset.dto";
import { ListBrandsQueryDto } from "./dto/list-brands-query.dto";

const BRAND_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  primaryColor: true,
  secondaryColor: true,
  accentColor: true,
  toneOfVoice: true,
  brandStory: true,
  guidelines: true,
  approvedAt: true,
  rejectedReason: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BrandSelect;

const ASSET_SELECT = {
  id: true,
  type: true,
  url: true,
  filename: true,
  mimeType: true,
  storageKey: true,
  altText: true,
  sortOrder: true,
  isApproved: true,
  notes: true,
  brandId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BrandAssetSelect;

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- helpers ---

  private async assertBrandOwnership(tenantId: string, brandId: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true, tenantId: true },
    });
    if (!brand) throw new NotFoundException("Marca nao encontrada");
    if (brand.tenantId !== tenantId) throw new ForbiddenException("Acesso negado a esta marca");
    return brand;
  }

  // --- tenant routes ---

  async create(tenantId: string, dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { slug: dto.slug },
      select: { id: true },
    });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' ja esta em uso`);

    return this.prisma.brand.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        status: dto.status ?? BrandStatus.DRAFT,
        primaryColor: dto.primaryColor,
        secondaryColor: dto.secondaryColor,
        accentColor: dto.accentColor,
        toneOfVoice: dto.toneOfVoice,
        brandStory: dto.brandStory,
        guidelines: dto.guidelines,
        tenantId,
      },
      select: BRAND_SELECT,
    });
  }

  async list(tenantId: string, query: ListBrandsQueryDto) {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BrandWhereInput = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: BRAND_SELECT,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(tenantId: string, id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: {
        ...BRAND_SELECT,
        assets: { select: ASSET_SELECT, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!brand) throw new NotFoundException("Marca nao encontrada");
    if (brand.tenantId !== tenantId) throw new ForbiddenException("Acesso negado a esta marca");
    return brand;
  }

  async update(tenantId: string, id: string, dto: UpdateBrandDto) {
    await this.assertBrandOwnership(tenantId, id);

    return this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
        ...(dto.secondaryColor !== undefined && { secondaryColor: dto.secondaryColor }),
        ...(dto.accentColor !== undefined && { accentColor: dto.accentColor }),
        ...(dto.toneOfVoice !== undefined && { toneOfVoice: dto.toneOfVoice }),
        ...(dto.brandStory !== undefined && { brandStory: dto.brandStory }),
        ...(dto.guidelines !== undefined && { guidelines: dto.guidelines }),
      },
      select: BRAND_SELECT,
    });
  }

  async archive(tenantId: string, id: string) {
    await this.assertBrandOwnership(tenantId, id);

    return this.prisma.brand.update({
      where: { id },
      data: { status: BrandStatus.ARCHIVED },
      select: BRAND_SELECT,
    });
  }

  // --- assets ---

  async addAsset(tenantId: string, brandId: string, dto: CreateBrandAssetDto) {
    await this.assertBrandOwnership(tenantId, brandId);

    return this.prisma.brandAsset.create({
      data: {
        brandId,
        type: dto.type,
        url: dto.url,
        filename: dto.filename,
        mimeType: dto.mimeType,
        storageKey: dto.storageKey,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
        isApproved: dto.isApproved ?? false,
        notes: dto.notes,
      },
      select: ASSET_SELECT,
    });
  }

  async listAssets(tenantId: string, brandId: string) {
    await this.assertBrandOwnership(tenantId, brandId);

    return this.prisma.brandAsset.findMany({
      where: { brandId },
      select: ASSET_SELECT,
      orderBy: { sortOrder: "asc" },
    });
  }

  async removeAsset(tenantId: string, brandId: string, assetId: string) {
    await this.assertBrandOwnership(tenantId, brandId);

    const asset = await this.prisma.brandAsset.findUnique({
      where: { id: assetId },
      select: { id: true, brandId: true },
    });
    if (!asset) throw new NotFoundException("Asset nao encontrado");
    if (asset.brandId !== brandId) throw new ForbiddenException("Asset nao pertence a esta marca");

    await this.prisma.brandAsset.delete({ where: { id: assetId } });
    return { ok: true };
  }

  // --- admin ---

  async adminList(query: ListBrandsQueryDto) {
    const { page = 1, limit = 20, search, status, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BrandWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          ...BRAND_SELECT,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminFindOne(id: string) {
    const brand = await this.prisma.brand.findUnique({
      where: { id },
      select: {
        ...BRAND_SELECT,
        tenant: { select: { id: true, name: true, slug: true } },
        assets: { select: ASSET_SELECT, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!brand) throw new NotFoundException("Marca nao encontrada");
    return brand;
  }
}
