import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CurrentTenant } from "../auth/decorators/current-tenant.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CatalogService } from "./catalog.service";
import { ListProductsQueryDto } from "./dto/list-products-query.dto";

@Controller("catalog/products")
@UseGuards(JwtAuthGuard)
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(
    @Query() query: ListProductsQueryDto,
    @CurrentUser() _user: AuthenticatedUser,
    @CurrentTenant() tenantId: string
  ): Promise<unknown> {
    if (!tenantId) throw new BadRequestException("Header X-Tenant-ID obrigatório");
    return this.catalog.publicList(query);
  }

  @Get(":slug")
  getBySlug(
    @Param("slug") slug: string,
    @CurrentUser() _user: AuthenticatedUser,
    @CurrentTenant() tenantId: string
  ): Promise<unknown> {
    if (!tenantId) throw new BadRequestException("Header X-Tenant-ID obrigatório");
    return this.catalog.publicGetBySlug(slug);
  }
}
