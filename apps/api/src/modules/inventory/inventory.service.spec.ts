import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { PrismaService } from "../../common/prisma.service";
import { InventoryMovementType } from "@prisma/client";

// --- Mock helpers ---

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

function makeTxMock() {
  return {
    inventoryItem: {
      findUnique: jest.fn().mockResolvedValue(mockItem),
      create: jest.fn().mockResolvedValue(mockItem),
      update: jest.fn().mockImplementation(
        ({ data }: { data: { quantityAvailable?: { increment?: number; decrement?: number } } }) => {
          const updated = { ...mockItem };
          if (data.quantityAvailable?.increment !== undefined) {
            updated.quantityAvailable = mockItem.quantityAvailable + data.quantityAvailable.increment;
          }
          if (data.quantityAvailable?.decrement !== undefined) {
            updated.quantityAvailable = mockItem.quantityAvailable - data.quantityAvailable.decrement;
          }
          return Promise.resolve(updated);
        }
      ),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    inventoryMovement: {
      create: jest.fn().mockResolvedValue({}),
    },
  };
}

function makePrismaMock() {
  return {
    inventoryItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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

// --- Tests ---

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

  // -- createInventoryIfMissing --

  describe("createInventoryIfMissing", () => {
    it("retorna item existente sem criar novo", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(mockItem);
      const result = await service.createInventoryIfMissing("variant-1");
      expect(result).toEqual(mockItem);
      expect(prisma.inventoryItem.create).not.toHaveBeenCalled();
    });

    it("cria item com quantidade zero quando nao existe", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);
      prisma.inventoryItem.create.mockResolvedValue({ ...mockItem, quantityAvailable: 0 });
      const result = await service.createInventoryIfMissing("variant-1");
      expect(prisma.inventoryItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ quantityAvailable: 0, quantityReserved: 0 }),
      });
      expect(result.quantityAvailable).toBe(0);
    });
  });

  // -- adjustInventory --

  describe("adjustInventory", () => {
    it("ADJUSTMENT_IN aumenta quantityAvailable e cria movement", async () => {
      const dto = { type: InventoryMovementType.ADJUSTMENT_IN, quantity: 10, reason: "Reposicao" };

      const result = await service.adjustInventory("variant-1", dto, "user-1");

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.adjustment.delta).toBe(10);
    });

    it("ADJUSTMENT_OUT reduz quantityAvailable e cria movement", async () => {
      const dto = { type: InventoryMovementType.ADJUSTMENT_OUT, quantity: 5, reason: "Descarte" };

      const result = await service.adjustInventory("variant-1", dto, "user-1");

      expect(result.adjustment.delta).toBe(-5);
    });

    it("ADJUSTMENT_OUT maior que disponivel lanca BadRequestException", async () => {
      prisma.$transaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) => {
        const tx = makeTxMock();
        tx.inventoryItem.updateMany.mockResolvedValue({ count: 0 });
        return cb(tx);
      });

      await expect(
        service.adjustInventory(
          "variant-1",
          { type: InventoryMovementType.ADJUSTMENT_OUT, quantity: 999, reason: "Erro intencional" },
          "user-1"
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("MANUAL_CORRECTION maior que disponivel lanca BadRequestException", async () => {
      prisma.$transaction.mockImplementationOnce(async (cb: (tx: unknown) => unknown) => {
        const tx = makeTxMock();
        tx.inventoryItem.updateMany.mockResolvedValue({ count: 0 });
        return cb(tx);
      });

      await expect(
        service.adjustInventory("variant-1", { type: InventoryMovementType.MANUAL_CORRECTION, quantity: 100 })
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -- getInventoryByVariantId --

  describe("getInventoryByVariantId", () => {
    it("retorna item com variant quando existe", async () => {
      const itemWithVariant = { ...mockItem, productVariant: mockVariant };
      prisma.inventoryItem.findUnique.mockResolvedValue(itemWithVariant);

      const result = await service.getInventoryByVariantId("variant-1");
      expect(result).toEqual(itemWithVariant);
    });

    it("retorna item virtual com quantidades zero quando inventario nao existe mas variante existe", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);
      prisma.productVariant.findUnique.mockResolvedValue(mockVariant);

      const result = await service.getInventoryByVariantId("variant-1");
      expect(result.quantityAvailable).toBe(0);
      expect(result.quantityReserved).toBe(0);
      expect(result.id).toBeNull();
    });

    it("lanca NotFoundException quando variante nao existe", async () => {
      prisma.inventoryItem.findUnique.mockResolvedValue(null);
      prisma.productVariant.findUnique.mockResolvedValue(null);

      await expect(
        service.getInventoryByVariantId("variant-inexistente")
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -- reserveStockInTransaction --

  describe("reserveStockInTransaction", () => {
    it("usa updateMany com condicao atomica de estoque disponivel", async () => {
      const tx = makeTxMock();

      await service.reserveStockInTransaction("variant-1", 5, "order-1", tx as never);

      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ quantityAvailable: { gte: 5 } }),
          data: expect.objectContaining({
            quantityAvailable: { decrement: 5 },
            quantityReserved: { increment: 5 },
          }),
        })
      );
    });

    it("cria movement do tipo RESERVATION quando reserva e valida", async () => {
      const tx = makeTxMock();

      await service.reserveStockInTransaction("variant-1", 5, "order-1", tx as never);

      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: InventoryMovementType.RESERVATION }),
        })
      );
    });

    it("lanca BadRequestException quando updateMany nao encontra linha (estoque insuficiente)", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.reserveStockInTransaction("variant-1", 10, "order-1", tx as never)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -- releaseReservationInTransaction --

  describe("releaseReservationInTransaction", () => {
    it("usa updateMany com condicao atomica de reserva", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue({ ...mockItem, quantityReserved: 10 });

      await service.releaseReservationInTransaction("variant-1", 5, "order-1", tx as never);

      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ quantityReserved: { gte: 5 } }),
          data: expect.objectContaining({
            quantityAvailable: { increment: 5 },
            quantityReserved: { decrement: 5 },
          }),
        })
      );
    });

    it("lanca BadRequestException quando nao ha reserva suficiente para liberar", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue({ ...mockItem, quantityReserved: 0 });
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.releaseReservationInTransaction("variant-1", 5, "order-1", tx as never)
      ).rejects.toThrow(BadRequestException);
    });

    it("lanca NotFoundException quando inventario nao existe", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(
        service.releaseReservationInTransaction("variant-1", 5, "order-1", tx as never)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -- commitReservationInTransaction --

  describe("commitReservationInTransaction", () => {
    it("debita de quantityReserved sem alterar quantityAvailable", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue({ ...mockItem, quantityReserved: 10 });

      await service.commitReservationInTransaction("variant-1", 5, "order-1", tx as never);

      expect(tx.inventoryItem.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ quantityReserved: { decrement: 5 } }),
        })
      );
    });

    it("cria movement do tipo COMMIT_RESERVATION", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue({ ...mockItem, quantityReserved: 10 });

      await service.commitReservationInTransaction("variant-1", 5, "order-1", tx as never);

      expect(tx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: InventoryMovementType.COMMIT_RESERVATION }),
        })
      );
    });

    it("lanca BadRequestException quando reserva e insuficiente", async () => {
      const tx = makeTxMock();
      tx.inventoryItem.findUnique.mockResolvedValue({ ...mockItem, quantityReserved: 3 });
      tx.inventoryItem.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.commitReservationInTransaction("variant-1", 5, "order-1", tx as never)
      ).rejects.toThrow(BadRequestException);
    });
  });
});
