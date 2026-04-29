import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { PrismaModule } from "./common/prisma.module";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { FulfillmentModule } from "./modules/fulfillment/fulfillment.module";
import { BillingModule } from "./modules/billing/billing.module";
import { FilesModule } from "./modules/files/files.module";
import { AuditModule } from "./modules/audit/audit.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // PrismaModule global — PrismaService disponível em todos os módulos
    PrismaModule,

    // Serve o frontend buildado (apps/web/out/) a partir da raiz /.
    // Rotas /api/* são excluídas e tratadas pelos controllers NestJS.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "..", "..", "apps", "web", "out"),
      exclude: ["/api/(.*)"],
    }),

    HealthModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    BrandsModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    FulfillmentModule,
    BillingModule,
    FilesModule,
    AuditModule,
  ],
})
export class AppModule {}
