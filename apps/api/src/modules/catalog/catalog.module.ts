import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { AdminProductsController } from "./admin-products.controller";
import { CatalogService } from "./catalog.service";
import { TenantContextGuard } from "../auth/guards/tenant-context.guard";

@Module({
  controllers: [CatalogController, AdminProductsController],
  providers: [CatalogService, TenantContextGuard],
  exports: [CatalogService],
})
export class CatalogModule {}
