import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../../common/prisma.service";
import { InventoryMovementType } from "@drop/database";

// ─── Mock helpers ────────────────────────────────────────────────────────────

const mockItem = {
  id: "item-1",
  productVariantId: "variant-1",
  quantityAvailable: 20,
  quantityReserved: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockVariant = {
  id: "variant-1",
  sku: "TEST-SKU-001",
  name: "Variante Teste",
  status: "ACTIVE",
  product: { id: "prod-1", name: "Produto Teste", slug: "produto-teste" },
};

function makePrismaMock() {
  return {
    inventoryItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(makeTxMock())),
  };
}

function makeTxMock() {
  return {
    inventoryItem: {
      findUnique: jest.fn().mockResolvedValue(mockItem),
      create: jest.fn().mockResolvedValue(mockItem),
      update: jest.fn().mockImplementation(({ data }: { data: { quantityAvailable?: { increment?: number; decrement?: number }; quantityReserved?: { increment?: number; decrement?: number } } }) => {
        const updated = { ...mockItem };
        if (data.quantityAvailable?.increment !== undefined) {
          updated.quantityAvailable = mockItem.quantityAvailable + data.quantityAvailable.increment;
        }
        if (data.quantityAvailable?.decrement !== undefined) {
          updated.quantityAvailable = mockItem.quantityAvailable - data.quantityAvailable.decrement;
        }
        return Promise.resolve(updated);
      }),
    },
    inventoryMovement: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("InventoryService", () => {
  let service: InventoryService;
  let prisma: ReturnType<typeof makePrismaMock>;

  beforeEach(async () => {
    prisma = makePrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // ── createInventoryIfMissing ──────────────────────────────────────────────

  describe("createInventoryIfMissing", () => {
    it("retorna item existente sem criar novo", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(mockItem);
      const result = await service.createInventoryIfMissing("variant-1");
      expect(result).toEqual(mockItem);
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    it("cria item com quantidade zero quando não existe", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);
      prisma.inventoryItem.create.mockResolvedValue({ ...mockItem, quantityAvailable: 0 });
      const result = await service.createInventoryIfMissing("variant-1");
      expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ quantityAvailable: 0, quantityReserved: 0 }),
      });
      expect(result.quantityAvailable).toBe(0);
    });
  });

  // ── adjustInventory ───────────────────────────────────────────────────────

  describe("adjustInventory", () => {
    it("ADJUSTMENT_IN aumenta quantityAvailable e cria movement", async () => {
      const dto = {
        type: InventoryMovementType.ADJUSTMENT_IN,
        quantity: 10,
        reason: "Reposição",
      };

      const result = await service.adjustInventory("variant-1", dto, "user-1");

      // O $transaction foi chamado
      expect(prisma.$transaction).toHaveBeenCalled();
      // delta positivo
      expect(result.adjustment.delta).toBe(10);
    });

    it("ADJUSTMENT_OUT reduz quantityAvailable e cria movement", async () => {
      const dto = {
        type: InventoryMovementType.ADJUSTMENT_OUT,
        quantity: 5,
        reason: "Descarte",
      };

      const result = await service.adjustInventory("variant-1", dto, "user-1");
      expect(result.adjustment.delta).toBe(-5);
    });

    it("ADJUSTMENT_OUT maior que disponível lança BadRequestException", async () => {
      const dto = {
        type: InventoryMovementType.ADJUSTMENT_OUT,
        quantity: 999, // maior que os 20 do mockItem
        reason: "Erro intencional",
      };

      await expect(
        service.adjustInventory("variant-1", dto, "user-1")
      ).rejects.toThrow(BadRequestException);
    });

    it("MANUAL_CORRECTION maior que disponível lança BadRequestException", async () => {
      const dto = {
        type: InventoryMovementType.MANUAL_CORRECTION,
        quantity: 100,
      };

      await expect(
        service.adjustInventory("variant-1", dto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── getInventoryByVariantId ───────────────────────────────────────────────

  describe("getInventoryByVariantId", () => {
    it("retorna item com variant quando existe", async () => {
      const itemWithVariant = { ...mockItem, productVariant: mockVariant };
      prisma.inventoryItem.findUnique.mockResolvedValue(itemWithVariant);

      const result = await service.getInventoryByVariantId("variant-1");
      expect(result).toEqual(itemWithVariant);
    });

    it("retorna item virtual com quantidades zero quando inventário não existe mas variante existe", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);
      prisma.productVariant.findUnique.mockResolvedValue(mockVariant);

      const result = await service.getInventoryByVariantId("variant-1");
      expect(result.quantityAvailable).toBe(0);
      expect(result.quantityReserved).toBe(0);
      expect(result.id).toBeNull();
    });

    it("lança NotFoundException quando variante não existe", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);
      prisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.getInventoryByVariantId("variant-inexistente")
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── reserveStockInTransaction ─────────────────────────────────────────────

  describe("reserveStockInTransaction", () => {
    it("lança BadRequestException quando reserva excede disponível", async () => {
      const tx = makeTxMock();
      // item com apenas 5 disponíveis
      tx.inventoryItem.findUnique.mockResolvedValue({ ...mockItem, quantityAvailable: 5 });

      await expect(
        service.reserveStockInTransaction("variant-1", 10, "order-1", tx as never)
      ).rejects.toThrow(BadRequestException);
    });

    it("cria movement do tipo RESERVATION quando reserva é válida", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue(mockItem); // 20 disponíveis

      await service.reserveStockInTransaction("variant-1", 5, "order-1", tx as never);

      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: InventoryMovementType.RESERVATION }),
        })
      );
    });
  });

  // ── releaseReservationInTransaction ──────────────────────────────────────

  describe("releaseReservationInTransaction", () => {
    it("lança BadRequestException quando não há reserva suficiente para liberar", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue({ ...mockItem, quantityReserved: 0 });

      await expect(
        service.releaseReservationInTransaction("variant-1", 5, "order-1", tx as never)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
