import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CatalogService } from "./catalog.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { CreateProductVariantDto } from "./dto/create-product-variant.dto";
import { UpdateProductVariantDto } from "./dto/update-product-variant.dto";
import { CreateProductMediaDto } from "./dto/create-product-media.dto";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

@Controller("admin/products")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminProductsController {
  constructor(private readonly catalog: CatalogService) {}

  @Post()
  create(@Body() dto: CreateProductDto): Promise<unknown> {
    return this.catalog.adminCreate(dto);
  }

  @Get()
  list(@Query() query: ListProductsQueryDto): Promise<unknown> {
    return this.catalog.adminList(query);
  }

  @Get(":id")
  get(@Param("id") id: string): Promise<unknown> {
    return this.catalog.adminGet(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateProductDto): Promise<unknown> {
    return this.catalog.adminUpdate(id, dto);
  }

  @Patch(":id/archive")
  @HttpCode(HttpStatus.OK)
  archive(@Param("id") id: string): Promise<unknown> {
    return this.catalog.adminArchive(id);
  }

  @Patch(":id/publish")
  @HttpCode(HttpStatus.OK)
  publish(@Param("id") id: string): Promise<unknown> {
    return this.catalog.adminPublish(id);
  }

  @Patch(":id/unpublish")
  @HttpCode(HttpStatus.OK)
  unpublish(@Param("id") id: string): Promise<unknown> {
    return this.catalog.adminUnpublish(id);
  }

  @Post(":productId/variants")
  createVariant(
    @Param("productId") productId: string,
    @Body() dto: CreateProductVariantDto
  ): Promise<unknown> {
    return this.catalog.adminCreateVariant(productId, dto);
  }

  @Patch(":productId/variants/:variantId")
  updateVariant(
    @Param("productId") productId: string,
    @Param("variantId") variantId: string,
    @Body() dto: UpdateProductVariantDto
  ): Promise<unknown> {
    return this.catalog.adminUpdateVariant(productId, variantId, dto);
  }

  @Patch(":productId/variants/:variantId/activate")
  @HttpCode(HttpStatus.OK)
  activateVariant(
    @Param("productId") productId: string,
    @Param("variantId") variantId: string
  ): Promise<unknown> {
    return this.catalog.adminActivateVariant(productId, variantId);
  }

  @Patch(":productId/variants/:variantId/deactivate")
  @HttpCode(HttpStatus.OK)
  deactivateVariant(
    @Param("productId") productId: string,
    @Param("variantId") variantId: string
  ): Promise<unknown> {
    return this.catalog.adminDeactivateVariant(productId, variantId);
  }

  @Get(":productId/media")
  getMedia(@Param("productId") productId: string): Promise<unknown> {
    return this.catalog.adminGetMedia(productId);
  }

  @Post(":productId/media")
  addMedia(
    @Param("productId") productId: string,
    @Body() dto: CreateProductMediaDto
  ): Promise<unknown> {
    return this.catalog.adminAddMedia(productId, dto);
  }

  @Delete(":productId/media/:mediaId")
  @HttpCode(HttpStatus.OK)
  deleteMedia(
    @Param("productId") productId: string,
    @Param("mediaId") mediaId: string
  ): Promise<unknown> {
    return this.catalog.adminDeleteMedia(productId, mediaId);
  }
}
