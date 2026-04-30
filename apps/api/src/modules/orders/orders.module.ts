import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { AdminOrdersController } from "./admin-orders.controller";
import { OrdersService } from "./orders.service";
import { InventoryModule } from "../inventory/inventory.module";
import { TenantContextGuard } from "../auth/guards/tenant-context.guard";

@Module({
  imports: [InventoryModule],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, TenantContextGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
