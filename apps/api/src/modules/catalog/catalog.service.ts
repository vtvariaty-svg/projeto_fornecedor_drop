import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma, ProductStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductVariantDto } from "./dto/create-product-variant.dto";
import { UpdateProductVariantDto } from "./dto/update-product-variant.dto";
import { CreateProductMediaDto } from "./dto/create-product-media.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

// Fields visible to lojistas (never expose costPrice or internal quantities)
const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  category: true,
  basePrice: true,
  createdAt: true,
  updatedAt: true,
  media: {
    select: {
      id: true,
      url: true,
      altText: true,
      sortOrder: true,
      variantId: true,
    },
    orderBy: { sortOrder: "asc" as const },
  },
  variants: {
    where: { status: ProductStatus.ACTIVE },
    select: {
      id: true,
      sku: true,
      name: true,
      color: true,
      material: true,
      size: true,
      hardware: true,
      salePrice: true,
      weightGrams: true,
      status: true,
      // Lido internamente para calcular isAvailable â€” nunca exposto diretamente
      inventoryItem: {
        select: { quantityAvailable: true },
      },
    },
  },
} satisfies Prisma.ProductSelect;

/** Formata um produto pÃºblico removendo campos internos e adicionando isAvailable */
function formatPublicProduct<
  T extends {
    variants: Array<{
      inventoryItem: { quantityAvailable: number } | null;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  },
>(product: T) {
  return {
    ...product,
    variants: product.variants.map(({ inventoryItem, ...rest }) => ({
      ...rest,
      isAvailable: (inventoryItem?.quantityAvailable ?? 0) > 0,
    })),
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // â”€â”€â”€ Admin: Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async adminCreate(dto: CreateProductDto) {
    await this.assertSlugAvailable(dto.slug);
    return this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        status: dto.status ?? ProductStatus.DRAFT,
        category: dto.category,
        basePrice: dto.basePrice,
        costPrice: dto.costPrice,
      },
    });
  }

  async adminList(query: ListProductsQueryDto) {
    const { page = 1, limit = 20, search, category, sku, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (status) where.status = status;
    if (category) where.category = { contains: category, mode: "insensitive" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (sku) {
      where.variants = { some: { sku: { contains: sku, mode: "insensitive" } } };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          variants: { select: { id: true, sku: true, name: true, status: true, salePrice: true } },
          media: { select: { id: true, url: true, altText: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async adminGet(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: { orderBy: { createdAt: "asc" } },
        media: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!product) throw new NotFoundException("Produto nÃ£o encontrado");
    return product;
  }

  async adminUpdate(id: string, dto: UpdateProductDto) {
    await this.assertProductExists(id);
    if (dto.slug) await this.assertSlugAvailable(dto.slug, id);
    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        status: dto.status,
        category: dto.category,
        basePrice: dto.basePrice,
        costPrice: dto.costPrice,
      },
    });
  }

  async adminArchive(id: string) {
    await this.assertProductExists(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });
  }

  // â”€â”€â”€ Admin: Variants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async adminCreateVariant(productId: string, dto: CreateProductVariantDto) {
    await this.assertProductExists(productId);
    await this.assertSkuAvailable(dto.sku);
    return this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku,
        name: dto.name,
        color: dto.color,
        material: dto.material,
        size: dto.size,
        hardware: dto.hardware,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        weightGrams: dto.weightGrams,
        status: dto.status ?? ProductStatus.ACTIVE,
      },
    });
  }

  async adminUpdateVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto
  ) {
    await this.assertVariantBelongsToProduct(productId, variantId);
    if (dto.sku) await this.assertSkuAvailable(dto.sku, variantId);
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: dto.sku,
        name: dto.name,
        color: dto.color,
        material: dto.material,
        size: dto.size,
        hardware: dto.hardware,
        salePrice: dto.salePrice,
        costPrice: dto.costPrice,
        weightGrams: dto.weightGrams,
        status: dto.status,
      },
    });
  }

  // â”€â”€â”€ Admin: Media â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async adminAddMedia(productId: string, dto: CreateProductMediaDto) {
    await this.assertProductExists(productId);
    if (dto.variantId) {
      await this.assertVariantBelongsToProduct(productId, dto.variantId);
    }
    return this.prisma.productMedia.create({
      data: {
        productId,
        url: dto.url,
        storageKey: dto.storageKey,
        altText: dto.altText,
        sortOrder: dto.sortOrder ?? 0,
        variantId: dto.variantId,
      },
    });
  }

  async adminDeleteMedia(productId: string, mediaId: string) {
    const media = await this.prisma.productMedia.findFirst({
      where: { id: mediaId, productId },
    });
    if (!media) throw new NotFoundException("MÃ­dia nÃ£o encontrada");
    await this.prisma.productMedia.delete({ where: { id: mediaId } });
    return { ok: true };
  }

  // â”€â”€â”€ Lojista: Catalog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async publicList(query: ListProductsQueryDto) {
    const { page = 1, limit = 20, search, category, sku } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
    };
    if (category) where.category = { contains: category, mode: "insensitive" };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (sku) {
      where.variants = {
        some: {
          sku: { contains: sku, mode: "insensitive" },
          status: ProductStatus.ACTIVE,
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: PUBLIC_PRODUCT_SELECT,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: items.map(formatPublicProduct), total, page, limit, pages: Math.ceil(total / limit) };
  }

  async publicGetBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      select: PUBLIC_PRODUCT_SELECT,
    });
    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException("Produto nÃ£o encontrado");
    }
    return formatPublicProduct(product);
  }

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private async assertProductExists(id: string) {
    const exists = await this.prisma.product.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException("Produto nÃ£o encontrado");
  }

  private async assertSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`Slug '${slug}' jÃ¡ estÃ¡ em uso`);
    }
  }

  private async assertSkuAvailable(sku: string, excludeId?: string) {
    const existing = await this.prisma.productVariant.findUnique({ where: { sku }, select: { id: true } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(`SKU '${sku}' jÃ¡ estÃ¡ em uso`);
    }
  }

  private async assertVariantBelongsToProduct(productId: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
      select: { id: true },
    });
    if (!variant) {
      throw new BadRequestException("Variante nÃ£o pertence a este produto");
    }
  }
}
