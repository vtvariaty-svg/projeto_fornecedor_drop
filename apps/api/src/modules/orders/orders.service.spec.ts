import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { OrdersService } from "./orders.service";
import { PrismaService } from "../../common/prisma.service";
import { InventoryService } from "../inventory/inventory.service";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant-1";
const USER_ID = "user-1";
const ORDER_ID = "order-1";
const VARIANT_ID = "variant-1";
const PRODUCT_ID = "product-1";

const mockVariantActive = {
  id: VARIANT_ID,
  sku: "TOTE-PRETO-M",
  name: "Preto M",
  salePrice: new Prisma.Decimal(50),
  status: "ACTIVE",
  product: { id: PRODUCT_ID, name: "Tote Bag", status: "ACTIVE" },
};

const mockOrder = {
  id: ORDER_ID,
  orderNumber: "ORD-20260429-ABC12",
  tenantId: TENANT_ID,
  status: OrderStatus.CONFIRMED,
  paymentStatus: PaymentStatus.MANUAL_CONFIRMED,
  customerName: "João Silva",
  customerEmail: "joao@loja.com",
  customerPhone: null,
  shippingAddressJson: { street: "Rua A", city: "SP", state: "SP", postalCode: "01310-000", country: "BR" },
  subtotalAmount: 100,
  shippingAmount: 0,
  discountAmount: 0,
  totalAmount: 100,
  total: 100,
  cancelledAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  notes: null,
  brandId: null,
  items: [{ id: "item-1", productVariantId: VARIANT_ID, quantity: 2 }],
  statusHistory: [],
};

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeTx() {
  return {
    productVariant: { findUnique: jest.fn().mockResolvedValue(mockVariantActive) },
    order: {
      create: jest.fn().mockResolvedValue(mockOrder),
      findFirst: jest.fn().mockResolvedValue(mockOrder),
      findUnique: jest.fn().mockResolvedValue(mockOrder),
      update: jest.fn().mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED, cancelledAt: new Date() }),
    },
    orderItem: { create: jest.fn().mockResolvedValue({}) },
    orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
  };
}

function makePrisma(txOverrides?: Partial<ReturnType<typeof makeTx>>) {
  const tx = { ...makeTx(), ...txOverrides };
  return {
    tenantUser: {
      findFirst: jest.fn().mockResolvedValue({ id: "tu-1" }),
    },
    order: {
      findMany: jest.fn().mockResolvedValue([mockOrder]),
      count: jest.fn().mockResolvedValue(1),
      findFirst: jest.fn().mockResolvedValue(mockOrder),
      findUnique: jest.fn().mockResolvedValue({ ...mockOrder, tenant: { id: TENANT_ID, name: "Loja Demo", slug: "loja-demo" }, statusHistory: [] }),
    },
    $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
  };
}

function makeInventory() {
  return {
    reserveStockInTransaction: jest.fn().mockResolvedValue({}),
    releaseReservationInTransaction: jest.fn().mockResolvedValue({}),
  };
}

function makeDto() {
  return {
    customerName: "João Silva",
    customerEmail: "joao@loja.com",
    shippingAddress: { street: "Rua A", city: "SP", state: "SP", postalCode: "01310-000", country: "BR" },
    items: [{ variantId: VARIANT_ID, quantity: 2 }],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrdersService", () => {
  let service: OrdersService;
  let prisma: ReturnType<typeof makePrisma>;
  let inventory: ReturnType<typeof makeInventory>;

  beforeEach(async () => {
    prisma = makePrisma();
    inventory = makeInventory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: InventoryService, useValue: inventory },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  // ── createManualOrder ─────────────────────────────────────────────────────

  describe("createManualOrder", () => {
    it("cria pedido com SKU ativo e estoque disponível", async () => {
      const result = await service.createManualOrder(TENANT_ID, makeDto(), USER_ID);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("pedido criado chama reserveStockInTransaction para cada item", async () => {
      await service.createManualOrder(TENANT_ID, makeDto(), USER_ID);
      expect(inventory.reserveStockInTransaction).toHaveBeenCalledWith(
        VARIANT_ID,
        2,
        ORDER_ID,
        expect.anything()
      );
    });

    it("pedido criado gera OrderItem com snapshot", async () => {
      const tx = makeTx();
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await service.createManualOrder(TENANT_ID, makeDto(), USER_ID);
      expect(tx.orderItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            skuSnapshot: "TOTE-PRETO-M",
            productNameSnapshot: "Tote Bag",
            variantNameSnapshot: "Preto M",
            quantity: 2,
          }),
        })
      );
    });

    it("pedido criado gera OrderStatusHistory com CONFIRMED", async () => {
      const tx = makeTx();
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await service.createManualOrder(TENANT_ID, makeDto(), USER_ID);
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: OrderStatus.CONFIRMED,
          }),
        })
      );
    });

    it("rejeita pedido sem itens", async () => {
      await expect(
        service.createManualOrder(TENANT_ID, { ...makeDto(), items: [] }, USER_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it("rejeita SKU inexistente", async () => {
      const tx = makeTx();
      tx.productVariant.findUnique.mockResolvedValue(null);
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await expect(
        service.createManualOrder(TENANT_ID, makeDto(), USER_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it("rejeita SKU inativo", async () => {
      const tx = makeTx();
      tx.productVariant.findUnique.mockResolvedValue({ ...mockVariantActive, status: "INACTIVE" });
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await expect(
        service.createManualOrder(TENANT_ID, makeDto(), USER_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it("rejeita produto inativo", async () => {
      const tx = makeTx();
      tx.productVariant.findUnique.mockResolvedValue({
        ...mockVariantActive,
        product: { ...mockVariantActive.product, status: "DRAFT" },
      });
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await expect(
        service.createManualOrder(TENANT_ID, makeDto(), USER_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it("bloqueia usuário sem acesso ao tenant", async () => {
      prisma.tenantUser.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.createManualOrder(TENANT_ID, makeDto(), USER_ID)
      ).rejects.toThrow(ForbiddenException);
    });

    it("bloqueia estoque insuficiente (via InventoryService)", async () => {
      inventory.reserveStockInTransaction.mockRejectedValueOnce(
        new BadRequestException("Estoque insuficiente para reserva.")
      );
      await expect(
        service.createManualOrder(TENANT_ID, makeDto(), USER_ID)
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── listOrders ────────────────────────────────────────────────────────────

  describe("listOrders", () => {
    it("retorna apenas pedidos do tenant autenticado", async () => {
      const result = await service.listOrders(TENANT_ID, USER_ID, {});
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        })
      );
      expect(result.items).toHaveLength(1);
    });

    it("bloqueia usuário sem acesso ao tenant", async () => {
      prisma.tenantUser.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.listOrders(TENANT_ID, USER_ID, {})
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getOrder ──────────────────────────────────────────────────────────────

  describe("getOrder", () => {
    it("retorna pedido do tenant autenticado", async () => {
      const result = await service.getOrder(TENANT_ID, ORDER_ID, USER_ID);
      expect(prisma.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: ORDER_ID, tenantId: TENANT_ID }),
        })
      );
      expect(result).toBeDefined();
    });

    it("lança NotFoundException para pedido de outro tenant", async () => {
      prisma.order.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.getOrder(TENANT_ID, ORDER_ID, USER_ID)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── cancelOrder ───────────────────────────────────────────────────────────

  describe("cancelOrder", () => {
    it("cancela pedido elegível e libera estoque", async () => {
      const tx = makeTx();
      tx.order.findFirst.mockResolvedValue(mockOrder);
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));

      await service.cancelOrder(TENANT_ID, ORDER_ID, {}, USER_ID);

      expect(inventory.releaseReservationInTransaction).toHaveBeenCalledWith(
        VARIANT_ID,
        2,
        ORDER_ID,
        expect.anything()
      );
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: OrderStatus.CANCELLED,
            fromStatus: OrderStatus.CONFIRMED,
          }),
        })
      );
    });

    it("bloqueia cancelamento de pedido já cancelado", async () => {
      const tx = makeTx();
      tx.order.findFirst.mockResolvedValue({ ...mockOrder, status: OrderStatus.CANCELLED });
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await expect(
        service.cancelOrder(TENANT_ID, ORDER_ID, {}, USER_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it("bloqueia cancelamento de pedido em status não elegível (SHIPPED)", async () => {
      const tx = makeTx();
      tx.order.findFirst.mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPED });
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await expect(
        service.cancelOrder(TENANT_ID, ORDER_ID, {}, USER_ID)
      ).rejects.toThrow(BadRequestException);
    });

    it("lança NotFoundException para pedido de outro tenant no cancelamento", async () => {
      const tx = makeTx();
      tx.order.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementationOnce((cb: (tx: unknown) => unknown) => cb(tx));
      await expect(
        service.cancelOrder(TENANT_ID, ORDER_ID, {}, USER_ID)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Isolamento de tenant ──────────────────────────────────────────────────

  describe("isolamento de tenant", () => {
    it("adminListOrders lista todos os tenants sem filtro", async () => {
      await service.adminListOrders({});
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ tenantId: TENANT_ID }),
        })
      );
    });

    it("adminListOrders com filtro de tenantId aplica corretamente", async () => {
      await service.adminListOrders({ tenantId: TENANT_ID });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID }),
        })
      );
    });
  });
});
