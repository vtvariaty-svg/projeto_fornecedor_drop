import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantContextGuard } from "../auth/guards/tenant-context.guard";
import { CurrentTenant } from "../auth/decorators/current-tenant.decorator";
import { TenantContext } from "../../common/types/tenant-context.type";
import { BrandsService } from "./brands.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";
import { CreateBrandAssetDto } from "./dto/create-brand-asset.dto";
import { ListBrandsQueryDto } from "./dto/list-brands-query.dto";

@Controller("brands")
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBrandDto, @CurrentTenant() tenant: TenantContext) {
    return this.brands.create(tenant.id, dto);
  }

  @Get()
  list(@Query() query: ListBrandsQueryDto, @CurrentTenant() tenant: TenantContext) {
    return this.brands.list(tenant.id, query);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentTenant() tenant: TenantContext) {
    return this.brands.findOne(tenant.id, id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateBrandDto,
    @CurrentTenant() tenant: TenantContext
  ) {
    return this.brands.update(tenant.id, id, dto);
  }

  @Patch(":id/archive")
  @HttpCode(HttpStatus.OK)
  archive(@Param("id") id: string, @CurrentTenant() tenant: TenantContext) {
    return this.brands.archive(tenant.id, id);
  }

  @Post(":id/assets")
  @HttpCode(HttpStatus.CREATED)
  addAsset(
    @Param("id") id: string,
    @Body() dto: CreateBrandAssetDto,
    @CurrentTenant() tenant: TenantContext
  ) {
    return this.brands.addAsset(tenant.id, id, dto);
  }

  @Get(":id/assets")
  listAssets(@Param("id") id: string, @CurrentTenant() tenant: TenantContext) {
    return this.brands.listAssets(tenant.id, id);
  }

  @Delete(":id/assets/:assetId")
  @HttpCode(HttpStatus.OK)
  removeAsset(
    @Param("id") id: string,
    @Param("assetId") assetId: string,
    @CurrentTenant() tenant: TenantContext
  ) {
    return this.brands.removeAsset(tenant.id, id, assetId);
  }

  @Get(":id/readiness")
  readiness(@Param("id") id: string, @CurrentTenant() tenant: TenantContext) {
    return this.brands.brandReadiness(tenant.id, id);
  }
}
