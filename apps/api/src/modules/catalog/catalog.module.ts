import { Module } from "@nestjs/common";
import { CatalogController } from "./catalog.controller";
import { AdminProductsController } from "./admin-products.controller";
import { AdminCustomizationOptionsController } from "./admin-customization-options.controller";
import { CatalogService } from "./catalog.service";
import { CustomizationOptionsService } from "./customization-options.service";
import { TenantContextGuard } from "../auth/guards/tenant-context.guard";

@Module({
  controllers: [CatalogController, AdminProductsController, AdminCustomizationOptionsController],
  providers: [CatalogService, CustomizationOptionsService, TenantContextGuard],
  exports: [CatalogService, CustomizationOptionsService],
})
export class CatalogModule {}
