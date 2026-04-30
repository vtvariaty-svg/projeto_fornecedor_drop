import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { BrandsService } from "./brands.service";
import { ListBrandsQueryDto } from "./dto/list-brands-query.dto";

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
}
