import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantContextGuard } from "../auth/guards/tenant-context.guard";
import { CurrentTenant } from "../auth/decorators/current-tenant.decorator";
import { TenantContext } from "../../common/types/tenant-context.type";
import { CatalogService } from "./catalog.service";
import { CustomizationOptionsService } from "./customization-options.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

@Controller("catalog/products")
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class CatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly customizations: CustomizationOptionsService
  ) {}

  @Get()
  list(
    @Query() query: ListProductsQueryDto,
    @CurrentTenant() _tenant: TenantContext
  ): Promise<unknown> {
    return this.catalog.publicList(query);
  }

  @Get(":slug")
  getBySlug(
    @Param("slug") slug: string,
    @CurrentTenant() _tenant: TenantContext
  ): Promise<unknown> {
    return this.catalog.publicGetBySlug(slug);
  }

  @Get(":slug/customization-options")
  getCustomizationOptions(
    @Param("slug") slug: string,
    @CurrentTenant() _tenant: TenantContext
  ): Promise<unknown> {
    return this.customizations.publicListByProductSlug(slug);
  }
}
