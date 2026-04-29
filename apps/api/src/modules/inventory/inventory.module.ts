import { Module } from "@nestjs/common";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";

@Module({
  controllers: [InventoryController],
  providers: [InventoryService],
  // Exporta o service para uso futuro pelo módulo de pedidos
  exports: [InventoryService],
})
export class InventoryModule {}
