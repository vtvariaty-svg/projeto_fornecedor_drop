import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { CreateManualOrderDto } from "./dto/create-manual-order.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { ListOrdersQueryDto } from "./dto/list-orders-query.dto";

// Status que permitem cancelamento pelo lojista
const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PENDING_FULFILLMENT,
];

// Campos que NÃO devem ser retornados ao lojista
const SAFE_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  notes: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  shippingAddressJson: true,
  subtotalAmount: true,
  shippingAmount: true,
  discountAmount: true,
  totalAmount: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  tenantId: true,
  brandId: true,
  items: {
    select: {
      id: true,
      skuSnapshot: true,
      productNameSnapshot: true,
      variantNameSnapshot: true,
      unitPriceSnapshot: true,
      customizationSnapshot: true,
      quantity: true,
      subtotalAmount: true,
      productVariantId: true,
      productId: true,
    },
  },
  statusHistory: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" as const },
  },
} satisfies Prisma.OrderSelect;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Valida que o usuário pertence ao tenant informado */
  private async assertTenantAccess(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantUser.findFirst({
      where: { userId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException("Acesso negado a este tenant");
    }
  }

  /** Gera número de pedido único: ORD-YYYYMMDD-XXXXX */
  private generateOrderNumber(): string {
    const date = new Date();
    const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `ORD-${yyyymmdd}-${rand}`;
  }

  // ─── Lojista: criar pedido ─────────────────────────────────────────────────

  async createManualOrder(
    tenantId: string,
    dto: CreateManualOrderDto,
    userId: string
  ) {
    await this.assertTenantAccess(userId, tenantId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("Pedido deve ter ao menos um item");
    }

    return this.prisma.$transaction(async (tx) => {
      // ── 1. Validar e coletar dados de cada item ──────────────────────────
      const resolvedItems: Array<{
        variant: {
          id: string;
          sku: string;
          name: string;
          salePrice: Prisma.Decimal;
          status: string;
          product: { id: string; name: string; status: string };
        };
        quantity: number;
      }> = [];

      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: {
            id: true,
            sku: true,
            name: true,
            salePrice: true,
            status: true,
            product: { select: { id: true, name: true, status: true } },
          },
        });

        if (!variant) {
          throw new BadRequestException(`SKU não encontrado: ${item.variantId}`);
        }
        if (variant.status !== "ACTIVE") {
          throw new BadRequestException(
            `SKU inativo: ${variant.sku}. Apenas SKUs ativos podem ser pedidos.`
          );
        }
        if (variant.product.status !== "ACTIVE") {
          throw new BadRequestException(
            `Produto inativo: ${variant.product.name}. Apenas produtos ativos podem ser pedidos.`
          );
        }

        resolvedItems.push({ variant, quantity: item.quantity });
      }

      // ── 2. Calcular totais ────────────────────────────────────────────────
      let subtotal = new Prisma.Decimal(0);
      for (const { variant, quantity } of resolvedItems) {
        subtotal = subtotal.add(variant.salePrice.mul(quantity));
      }
      const shipping = new Prisma.Decimal(0); // frete não implementado nesta fase
      const discount = new Prisma.Decimal(0);
      const total = subtotal.add(shipping).sub(discount);

      // ── 3. Criar o pedido ─────────────────────────────────────────────────
      const orderNumber = this.generateOrderNumber();

      const order = await tx.order.create({
        data: {
          orderNumber,
          tenantId,
          brandId: dto.brandId ?? null,
          status: OrderStatus.CONFIRMED,
          paymentStatus: PaymentStatus.MANUAL_CONFIRMED,
          notes: dto.notes,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          shippingAddressJson: JSON.parse(JSON.stringify(dto.shippingAddress)) as Prisma.InputJsonValue,
          subtotalAmount: subtotal,
          shippingAmount: shipping,
          discountAmount: discount,
          totalAmount: total,
          total, // campo legado
          createdByUserId: userId,
        },
      });

      // ── 4. Criar itens com snapshot ───────────────────────────────────────
      for (const { variant, quantity } of resolvedItems) {
        const lineTotal = variant.salePrice.mul(quantity);
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: variant.product.id,
            productVariantId: variant.id,
            skuSnapshot: variant.sku,
            productNameSnapshot: variant.product.name,
            variantNameSnapshot: variant.name,
            unitPriceSnapshot: variant.salePrice,
            customizationSnapshot: {},
            quantity,
            subtotalAmount: lineTotal,
            // campos legados
            snapshotName: `${variant.product.name} — ${variant.name}`,
            snapshotSku: variant.sku,
            snapshotPrice: variant.salePrice,
            snapshotCustomization: Prisma.JsonNull,
            unitPrice: variant.salePrice,
            total: lineTotal,
          },
        });
      }

      // ── 5. Criar histórico inicial de status ──────────────────────────────
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: OrderStatus.CONFIRMED,
          status: OrderStatus.CONFIRMED, // campo legado
          reason: "Pedido criado manualmente",
          createdByUserId: userId,
        },
      });

      // ── 6. Reservar estoque para cada item (dentro da mesma transação) ────
      for (const { variant, quantity } of resolvedItems) {
        await this.inventory.reserveStockInTransaction(
          variant.id,
          quantity,
          order.id,
          tx
        );
      }

      // ── 7. Retornar pedido sem dados internos sensíveis ───────────────────
      return tx.order.findUnique({
        where: { id: order.id },
        select: SAFE_ORDER_SELECT,
      });
    });
  }

  // ─── Lojista: listar pedidos ────────────────────────────────────────────────

  async listOrders(tenantId: string, userId: string, query: ListOrdersQueryDto) {
    await this.assertTenantAccess(userId, tenantId);

    const { page = 1, limit = 20, status, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { tenantId };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          customerName: true,
          totalAmount: true,
          cancelledAt: true,
          createdAt: true,
          // itens resumidos
          items: {
            select: {
              id: true,
              productNameSnapshot: true,
              skuSnapshot: true,
              quantity: true,
              subtotalAmount: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Lojista: detalhe do pedido ─────────────────────────────────────────────

  async getOrder(tenantId: string, orderId: string, userId: string) {
    await this.assertTenantAccess(userId, tenantId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: SAFE_ORDER_SELECT,
    });

    if (!order) throw new NotFoundException("Pedido não encontrado");
    return order;
  }

  // ─── Lojista: cancelar pedido ──────────────────────────────────────────────

  async cancelOrder(
    tenantId: string,
    orderId: string,
    dto: CancelOrderDto,
    userId: string
  ) {
    await this.assertTenantAccess(userId, tenantId);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        include: {
          items: {
            select: { productVariantId: true, quantity: true },
          },
        },
      });

      if (!order) throw new NotFoundException("Pedido não encontrado");

      if (order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException("Pedido já está cancelado");
      }

      if (!CANCELLABLE_STATUSES.includes(order.status)) {
        throw new BadRequestException(
          `Pedido com status '${order.status}' não pode ser cancelado pelo lojista`
        );
      }

      // Liberar estoque reservado de cada item
      for (const item of order.items) {
        await this.inventory.releaseReservationInTransaction(
          item.productVariantId,
          item.quantity,
          orderId,
          tx
        );
      }

      // Atualizar status do pedido
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        select: SAFE_ORDER_SELECT,
      });

      // Registrar histórico de status
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: OrderStatus.CANCELLED,
          status: OrderStatus.CANCELLED, // campo legado
          reason: dto.reason ?? "Cancelado pelo lojista",
          createdByUserId: userId,
        },
      });

      return updated;
    });
  }

  // ─── Admin: listar todos os pedidos ─────────────────────────────────────────

  async adminListOrders(query: ListOrdersQueryDto) {
    const { page = 1, limit = 20, status, search, tenantId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          customerName: true,
          totalAmount: true,
          tenantId: true,
          cancelledAt: true,
          createdAt: true,
          items: { select: { id: true, skuSnapshot: true, quantity: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ─── Admin: detalhe completo ──────────────────────────────────────────────

  async adminGetOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        statusHistory: { orderBy: { createdAt: "desc" } },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!order) throw new NotFoundException("Pedido não encontrado");
    return order;
  }
}
