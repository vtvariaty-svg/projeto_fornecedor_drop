import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from "@nestjs/common";
import { UserRole } from "@drop/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { InventoryService } from "./inventory.service";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";
import { ListInventoryQueryDto } from "./dto/list-inventory-query.dto";
import { ListMovementsQueryDto } from "./dto/list-movements-query.dto";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";

@Controller("admin/inventory")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  /**
   * GET /api/admin/inventory
   * Lista estoque de todos os SKUs com paginação e busca.
   */
  @Get()
  list(@Query() query: ListInventoryQueryDto) {
    return this.inventory.listInventory(query);
  }

  /**
   * GET /api/admin/inventory/:variantId
   * Detalhe do estoque de um SKU específico.
   */
  @Get(":variantId")
  getByVariant(@Param("variantId") variantId: string) {
    return this.inventory.getInventoryByVariantId(variantId);
  }

  /**
   * GET /api/admin/inventory/:variantId/movements
   * Histórico de movimentações do SKU.
   */
  @Get(":variantId/movements")
  movements(
    @Param("variantId") variantId: string,
    @Query() query: ListMovementsQueryDto
  ) {
    return this.inventory.listMovements(variantId, query);
  }

  /**
   * POST /api/admin/inventory/:variantId/adjust
   * Ajuste manual de estoque (entrada, saída ou correção).
   */
  @Post(":variantId/adjust")
  @HttpCode(HttpStatus.OK)
  adjust(
    @Param("variantId") variantId: string,
    @Body() dto: AdjustInventoryDto,
    @Request() req: { user: AuthenticatedUser }
  ) {
    return this.inventory.adjustInventory(variantId, dto, req.user?.id);
  }
}
