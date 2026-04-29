import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InventoryMovementType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";
import { ListInventoryQueryDto } from "./dto/list-inventory-query.dto";
import { ListMovementsQueryDto } from "./dto/list-movements-query.dto";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Helpers internos ---

  // Garante que existe um InventoryItem para o variant.
  // Cria com quantidade zero se nao existir. Aceita transaction client opcional.
  async createInventoryIfMissing(
    variantId: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx ?? this.prisma;
    const existing = await client.inventoryItem.findUnique({
      where: { productVariantId: variantId },
    });
    if (existing) return existing;
    return client.inventoryItem.create({
      data: { productVariantId: variantId, quantityAvailable: 0, quantityReserved: 0 },
    });
  }

  // --- Admin: consultas ---

  async getInventoryByVariantId(variantId: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { productVariantId: variantId },
      include: {
        productVariant: {
          select: {
            id: true,
            sku: true,
            name: true,
            status: true,
            product: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!item) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
          product: { select: { id: true, name: true, slug: true } },
        },
      });
      if (!variant) throw new NotFoundException("Variante nao encontrada");
      return {
        id: null,
        productVariantId: variantId,
        quantityAvailable: 0,
        quantityReserved: 0,
        createdAt: null,
        updatedAt: null,
        productVariant: variant,
      };
    }
    return item;
  }

  async listInventory(query: ListInventoryQueryDto) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const variantWhere: Prisma.ProductVariantWhereInput = {};
    if (search) {
      variantWhere.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [variants, total] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: variantWhere,
        skip,
        take: limit,
        orderBy: { sku: "asc" },
        select: {
          id: true,
          sku: true,
          name: true,
          status: true,
          product: { select: { id: true, name: true, slug: true } },
          inventoryItem: {
            select: {
              id: true,
              quantityAvailable: true,
              quantityReserved: true,
              updatedAt: true,
            },
          },
        },
      }),
      this.prisma.productVariant.count({ where: variantWhere }),
    ]);

    const items = variants.map((v) => ({
      variantId: v.id,
      sku: v.sku,
      variantName: v.name,
      variantStatus: v.status,
      product: v.product,
      quantityAvailable: v.inventoryItem?.quantityAvailable ?? 0,
      quantityReserved: v.inventoryItem?.quantityReserved ?? 0,
      quantityTotal:
        (v.inventoryItem?.quantityAvailable ?? 0) +
        (v.inventoryItem?.quantityReserved ?? 0),
      inventoryItemId: v.inventoryItem?.id ?? null,
      updatedAt: v.inventoryItem?.updatedAt ?? null,
    }));

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async listMovements(variantId: string, query: ListMovementsQueryDto) {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException("Variante nao encontrada");

    const item = await this.prisma.inventoryItem.findUnique({
      where: { productVariantId: variantId },
      select: { id: true },
    });

    if (!item) {
      return { items: [], total: 0, page, limit, pages: 0 };
    }

    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: { inventoryItemId: item.id },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.inventoryMovement.count({
        where: { inventoryItemId: item.id },
      }),
    ]);

    return { items: movements, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // --- Admin: ajuste manual ---

  async adjustInventory(
    variantId: string,
    dto: AdjustInventoryDto,
    userId?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const item = await this.createInventoryIfMissing(variantId, tx);

      const isOutbound =
        dto.type === InventoryMovementType.ADJUSTMENT_OUT ||
        dto.type === InventoryMovementType.MANUAL_CORRECTION;

      let updated;

      if (isOutbound) {
        // Atualizacao atomica condicional — evita saldo negativo em concorrencia
        const result = await tx.inventoryItem.updateMany({
          where: { id: item.id, quantityAvailable: { gte: dto.quantity } },
          data: { quantityAvailable: { decrement: dto.quantity } },
        });
        if (result.count === 0) {
          throw new BadRequestException(
            `Estoque insuficiente. Disponivel: ${item.quantityAvailable}, solicitado: ${dto.quantity}`
          );
        }
        updated = await tx.inventoryItem.findUnique({ where: { id: item.id } });
      } else {
        updated = await tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantityAvailable: { increment: dto.quantity } },
        });
      }

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          variantId,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          referenceType: "MANUAL_ADJUSTMENT",
          createdByUserId: userId,
        },
      });

      const delta = isOutbound ? -dto.quantity : dto.quantity;
      return {
        variantId,
        inventoryItemId: item.id,
        quantityAvailable: updated!.quantityAvailable,
        quantityReserved: updated!.quantityReserved,
        adjustment: { type: dto.type, quantity: dto.quantity, delta },
      };
    });
  }

  // --- Metodos transacionais (uso pelo modulo de pedidos) ---

  // Reserva estoque: subtrai de available, soma em reserved.
  // Usa updateMany com condicao atomica para evitar overbooking concorrente.
  // DEVE ser chamado dentro de uma transacao Prisma existente.
  async reserveStockInTransaction(
    variantId: string,
    qty: number,
    referenceId: string,
    tx: Prisma.TransactionClient
  ) {
    const item = await this.createInventoryIfMissing(variantId, tx);

    const result = await tx.inventoryItem.updateMany({
      where: { id: item.id, quantityAvailable: { gte: qty } },
      data: {
        quantityAvailable: { decrement: qty },
        quantityReserved: { increment: qty },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        `Estoque insuficiente para reserva. Disponivel: ${item.quantityAvailable}, solicitado: ${qty}`
      );
    }

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        variantId,
        type: InventoryMovementType.RESERVATION,
        quantity: qty,
        referenceType: "ORDER",
        referenceId,
      },
    });

    return tx.inventoryItem.findUnique({ where: { id: item.id } });
  }

  // Libera reserva: reverte reserved -> available (pedido cancelado).
  // DEVE ser chamado dentro de uma transacao Prisma existente.
  async releaseReservationInTransaction(
    variantId: string,
    qty: number,
    referenceId: string,
    tx: Prisma.TransactionClient
  ) {
    const item = await tx.inventoryItem.findUnique({
      where: { productVariantId: variantId },
    });
    if (!item) throw new NotFoundException("InventoryItem nao encontrado");

    const result = await tx.inventoryItem.updateMany({
      where: { id: item.id, quantityReserved: { gte: qty } },
      data: {
        quantityAvailable: { increment: qty },
        quantityReserved: { decrement: qty },
      },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        `Reserva insuficiente para liberar. Reservado: ${item.quantityReserved}, solicitado: ${qty}`
      );
    }

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        variantId,
        type: InventoryMovementType.RELEASE_RESERVATION,
        quantity: qty,
        referenceType: "ORDER",
        referenceId,
      },
    });

    return tx.inventoryItem.findUnique({ where: { id: item.id } });
  }

  // Confirma reserva: debita reserved (pedido finalizado/enviado).
  // DEVE ser chamado dentro de uma transacao Prisma existente.
  async commitReservationInTransaction(
    variantId: string,
    qty: number,
    referenceId: string,
    tx: Prisma.TransactionClient
  ) {
    const item = await tx.inventoryItem.findUnique({
      where: { productVariantId: variantId },
    });
    if (!item) throw new NotFoundException("InventoryItem nao encontrado");

    const result = await tx.inventoryItem.updateMany({
      where: { id: item.id, quantityReserved: { gte: qty } },
      data: { quantityReserved: { decrement: qty } },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        `Reserva insuficiente para confirmar. Reservado: ${item.quantityReserved}, solicitado: ${qty}`
      );
    }

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: item.id,
        variantId,
        type: InventoryMovementType.COMMIT_RESERVATION,
        quantity: qty,
        referenceType: "ORDER",
        referenceId,
      },
    });

    return tx.inventoryItem.findUnique({ where: { id: item.id } });
  }
}
