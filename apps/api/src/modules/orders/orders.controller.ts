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
import { TenantContextGuard } from "../auth/guards/tenant-context.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { CurrentTenant } from "../auth/decorators/current-tenant.decorator";
import { AuthenticatedUser } from "../../common/types/authenticated-user.type";
import { TenantContext } from "../../common/types/tenant-context.type";
import { OrdersService } from "./orders.service";
import { CreateManualOrderDto } from "./dto/create-manual-order.dto";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";

@Controller("orders")
@UseGuards(JwtAuthGuard, TenantContextGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post("manual")
  @HttpCode(HttpStatus.CREATED)
  createManual(
    @Body() dto: CreateManualOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext
  ) {
    return this.orders.createManualOrder(tenant.id, dto, user.id);
  }

  @Get()
  list(
    @Query() query: ListOrdersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext
  ) {
    return this.orders.listOrders(tenant.id, user.id, query);
  }

  @Get(":id")
  getOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext
  ) {
    return this.orders.getOrder(tenant.id, id, user.id);
  }

  @Post(":id/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param("id") id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentTenant() tenant: TenantContext
  ) {
    return this.orders.cancelOrder(tenant.id, id, dto, user.id);
  }
}
