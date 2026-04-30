import { Module } from "@nestjs/common";
import { BrandsController } from "./brands.controller";
import { AdminBrandsController } from "./admin-brands.controller";
import { BrandsService } from "./brands.service";
import { TenantContextGuard } from "../auth/guards/tenant-context.guard";

@Module({
  controllers: [BrandsController, AdminBrandsController],
  providers: [BrandsService, TenantContextGuard],
  exports: [BrandsService],
})
export class BrandsModule {}
