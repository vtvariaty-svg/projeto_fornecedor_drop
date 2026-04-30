import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { CreateCustomizationOptionDto } from "./dto/create-customization-option.dto";
import { UpdateCustomizationOptionDto } from "./dto/update-customization-option.dto";
import { LinkProductCustomizationOptionDto } from "./dto/link-product-customization-option.dto";

const OPTION_SELECT = {
  id: true,
  name: true,
  description: true,
  type: true,
  isActive: true,
  requiresApproval: true,
  additionalPrice: true,
  createdAt: true,
  updatedAt: true,
} as const;

const LINK_SELECT = {
  id: true,
  isRequired: true,
  additionalPrice: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  customizationOption: { select: OPTION_SELECT },
} as const;

@Injectable()
export class CustomizationOptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Admin: global options ---

  async create(dto: CreateCustomizationOptionDto) {
    return this.prisma.customizationOption.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        isActive: dto.isActive ?? true,
        requiresApproval: dto.requiresApproval ?? false,
        ...(dto.additionalPrice !== undefined && { additionalPrice: dto.additionalPrice }),
      },
      select: OPTION_SELECT,
    });
  }

  async list(onlyActive = false) {
    return this.prisma.customizationOption.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      select: OPTION_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    const opt = await this.prisma.customizationOption.findUnique({
      where: { id },
      select: OPTION_SELECT,
    });
    if (!opt) throw new NotFoundException("Opcao de personalizacao nao encontrada");
    return opt;
  }

  async update(id: string, dto: UpdateCustomizationOptionDto) {
    await this.findById(id);
    return this.prisma.customizationOption.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.requiresApproval !== undefined && { requiresApproval: dto.requiresApproval }),
        ...(dto.additionalPrice !== undefined && { additionalPrice: dto.additionalPrice }),
      },
      select: OPTION_SELECT,
    });
  }

  // --- Admin: product links ---

  async linkToProduct(productId: string, dto: LinkProductCustomizationOptionDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Produto nao encontrado");

    await this.findById(dto.customizationOptionId);

    const existing = await this.prisma.productCustomizationOption.findUnique({
      where: {
        productId_customizationOptionId: {
          productId,
          customizationOptionId: dto.customizationOptionId,
        },
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException("Opcao ja vinculada a este produto");

    return this.prisma.productCustomizationOption.create({
      data: {
        productId,
        customizationOptionId: dto.customizationOptionId,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? 0,
        ...(dto.additionalPrice !== undefined && { additionalPrice: dto.additionalPrice }),
      },
      select: LINK_SELECT,
    });
  }

  async listByProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException("Produto nao encontrado");

    return this.prisma.productCustomizationOption.findMany({
      where: { productId },
      select: LINK_SELECT,
      orderBy: { sortOrder: "asc" },
    });
  }

  async unlinkFromProduct(productId: string, optionId: string) {
    const link = await this.prisma.productCustomizationOption.findUnique({
      where: {
        productId_customizationOptionId: {
          productId,
          customizationOptionId: optionId,
        },
      },
      select: { id: true },
    });
    if (!link) throw new NotFoundException("Vinculo nao encontrado");

    await this.prisma.productCustomizationOption.delete({ where: { id: link.id } });
    return { ok: true };
  }

  // --- Public: active options for product slug ---

  async publicListByProductSlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException("Produto nao encontrado");
    }

    const links = await this.prisma.productCustomizationOption.findMany({
      where: {
        productId: product.id,
        customizationOption: { isActive: true },
      },
      select: LINK_SELECT,
      orderBy: { sortOrder: "asc" },
    });

    return links;
  }
}
