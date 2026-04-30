import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { BrandsService } from "./brands.service";
import { ListBrandsQueryDto } from "./dto/list-brands-query.dto";
import { RejectBrandDto } from "./dto/review-brand.dto";
import { RejectBrandAssetDto } from "./dto/review-brand-asset.dto";

@Controller("admin/brands")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminBrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  list(@Query() query: ListBrandsQueryDto) {
    return this.brands.adminList(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.brands.adminFindOne(id);
  }

  @Patch(":id/approve")
  @HttpCode(HttpStatus.OK)
  approve(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.brands.approveBrand(id, user.id);
  }

  @Patch(":id/reject")
  @HttpCode(HttpStatus.OK)
  reject(
    @Param("id") id: string,
    @Body() dto: RejectBrandDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.brands.rejectBrand(id, dto, user.id);
  }

  @Patch(":brandId/assets/:assetId/approve")
  @HttpCode(HttpStatus.OK)
  approveAsset(
    @Param("brandId") brandId: string,
    @Param("assetId") assetId: string,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.brands.approveAsset(brandId, assetId, user.id);
  }

  @Patch(":brandId/assets/:assetId/reject")
  @HttpCode(HttpStatus.OK)
  rejectAsset(
    @Param("brandId") brandId: string,
    @Param("assetId") assetId: string,
    @Body() dto: RejectBrandAssetDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.brands.rejectAsset(brandId, assetId, dto, user.id);
  }
}
