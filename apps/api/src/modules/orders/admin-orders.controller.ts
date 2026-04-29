import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@drop/database";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { OrdersService } from "./orders.service";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";

@Controller("admin/orders")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * GET /api/admin/orders
   * Lista pedidos de todos os tenants com filtros.
   */
  @Get()
  list(@Query() query: ListOrdersQueryDto) {
    return this.orders.adminListOrders(query);
  }

  /**
   * GET /api/admin/orders/:id
   * Detalhe completo do pedido (inclui dados de tenant).
   */
  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.orders.adminGetOrder(id);
  }
}
