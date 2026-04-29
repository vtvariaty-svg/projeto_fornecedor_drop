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
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CurrentTenant } from "../auth/decorators/current-tenant.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { OrdersService } from "./orders.service";
import { CreateManualOrderDto } from "./dto/create-manual-order.dto";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { BadRequestException } from "@nestjs/common";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * POST /api/orders/manual
   * Cria um pedido manual reservando estoque na mesma transação.
   */
  @Post("manual")
  @HttpCode(HttpStatus.CREATED)
  createManual(
    @Body() dto: CreateManualOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string
  ) {
    if (!tenantId) throw new BadRequestException("Header X-Tenant-ID obrigatório");
    return this.orders.createManualOrder(tenantId, dto, user.id);
  }

  /**
   * GET /api/orders
   * Lista pedidos do tenant autenticado.
   */
  @Get()
  list(
    @Query() query: ListOrdersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string
  ) {
    if (!tenantId) throw new BadRequestException("Header X-Tenant-ID obrigatório");
    return this.orders.listOrders(tenantId, user.id, query);
  }

  /**
   * GET /api/orders/:id
   * Detalhe de pedido do tenant autenticado.
   */
  @Get(":id")
  getOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string
  ) {
    if (!tenantId) throw new BadRequestException("Header X-Tenant-ID obrigatório");
    return this.orders.getOrder(tenantId, id, user.id);
  }

  /**
   * POST /api/orders/:id/cancel
   * Cancela pedido elegível e libera estoque reservado.
   */
  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param("id") id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenantId: string
  ) {
    if (!tenantId) throw new BadRequestException("Header X-Tenant-ID obrigatório");
    return this.orders.cancelOrder(tenantId, id, dto, user.id);
  }
}
