import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { AttachUserToTenantDto } from "./dto/attach-user-tenant.dto";
import { UserRole } from "@prisma/client";

@Controller("admin/tenants")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminTenantsController {
  constructor(private readonly tenants: TenantsService) {}

  // GET /api/admin/tenants — lista tenants com paginação
  @Get()
  list(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.tenants.adminListTenants(page, Math.min(limit, 100));
  }

  // POST /api/admin/tenants — cria novo tenant
  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.adminCreateTenant(dto);
  }

  // POST /api/admin/tenants/:tenantId/users — vincula usuário ao tenant
  @Post(":tenantId/users")
  attachUser(
    @Param("tenantId") tenantId: string,
    @Body() dto: AttachUserToTenantDto,
  ) {
    return this.tenants.adminAttachUserToTenant(tenantId, dto);
  }

  // POST /api/admin/tenants/bootstrap-current-user — apenas SUPER_ADMIN
  // Idempotente: cria ou reutiliza tenant inicial para o admin atual.
  // Deve vir ANTES de :tenantId/users para evitar conflito de rota.
  @Post("bootstrap-current-user")
  @Roles(UserRole.SUPER_ADMIN)
  bootstrapCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return this.tenants.bootstrapCurrentSuperAdminTenant(user.id);
  }
}
