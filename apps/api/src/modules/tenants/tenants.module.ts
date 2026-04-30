import { Module } from "@nestjs/common";
import { TenantsController } from "./tenants.controller";
import { AdminTenantsController } from "./admin-tenants.controller";
import { TenantsService } from "./tenants.service";

@Module({
  controllers: [TenantsController, AdminTenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
