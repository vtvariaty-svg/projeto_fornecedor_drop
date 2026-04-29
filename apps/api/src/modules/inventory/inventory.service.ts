import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InventoryMovementType, Prisma } from "@drop/database";
import { PrismaService } from "../../common/prisma.service";
import { AdjustInventoryDto } from "./dto/adjust-inventory.dto";
import { ListInventoryQueryDto } from "./dto/list-inventory-query.dto";
import { ListMovementsQueryDto } from "./dto/list-movements-query.dto";

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers internos ────────────────────────────────────────────────────

  /**
   * Garante que existe um InventoryItem para o variant.
   * Cria com quantidade zero se não existir.
   * Aceita um client de transação opcional.
   */
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

  // ─── Admin: consultas ────────────────────────────────────────────────────

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
      // Verifica se a variante existe antes de retornar 404 de inventário
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: variantId },
        select: { id: true, sku: true, name: true, status: true, product: { select: { id: true, name: true, slug: true } } },
      });
      if (!variant) throw new NotFoundException("Variante não encontrada");
      // Retorna item virtual com zero
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

    // Busca variantes (com ou sem inventoryItem)
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

    // Garante que o variant existe
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });
    if (!variant) throw new NotFoundException("Variante não encontrada");

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

  // ─── Admin: ajuste manual ────────────────────────────────────────────────

  async adjustInventory(
    variantId: string,
    dto: AdjustInventoryDto,
    userId?: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Garante que o item existe
      const item = await this.createInventoryIfMissing(variantId, tx);

      const isOutbound =
        dto.type === InventoryMovementType.ADJUSTMENT_OUT ||
        dto.type === InventoryMovementType.MANUAL_CORRECTION;

      // Valida estoque não-negativo
      if (isOutbound && item.quantityAvailable < dto.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente. Disponível: ${item.quantityAvailable}, solicitado: ${dto.quantity}`
        );
      }

      const delta = isOutbound ? -dto.quantity : dto.quantity;

      // Atualiza quantidades
      const updated = await tx.inventoryItem.update({
        where: { id: item.id },
        data: { quantityAvailable: { increment: delta } },
      });

      // Registra movimentação
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

      return {
        variantId,
        inventoryItemId: item.id,
        quantityAvailable: updated.quantityAvailable,
        quantityReserved: updated.quantityReserved,
        adjustment: { type: dto.type, quantity: dto.quantity, delta },
      };
    });
  }

  // ─── Métodos transacionais (uso futuro pelo módulo de pedidos) ────────────

  /**
   * Reserva estoque: subtrai de available, soma em reserved.
   * DEVE ser chamado dentro de uma transação Prisma existente.
   */
  async reserveStockInTransaction(
    variantId: string,
    qty: number,
    referenceId: string,
    tx: Prisma.TransactionClient
  ) {
    const item = await this.createInventoryIfMissing(variantId, tx);

    if (item.quantityAvailable < qty) {
      throw new BadRequestException(
        `Estoque insuficiente para reserva. Disponível: ${item.quantityAvailable}, solicitado: ${qty}`
      );
    }

    const updated = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantityAvailable: { decrement: qty },
        quantityReserved: { increment: qty },
      },
    });

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

    return updated;
  }

  /**
   * Libera reserva: reverte reserved → available (pedido cancelado).
   * DEVE ser chamado dentro de uma transação Prisma existente.
   */
  async releaseReservationInTransaction(
    variantId: string,
    qty: number,
    referenceId: string,
    tx: Prisma.TransactionClient
  ) {
    const item = await tx.inventoryItem.findUnique({
      where: { productVariantId: variantId },
    });
    if (!item) throw new NotFoundException("InventoryItem não encontrado");
    if (item.quantityReserved < qty) {
      throw new BadRequestException(
        `Reserva insuficiente para liberar. Reservado: ${item.quantityReserved}, solicitado: ${qty}`
      );
    }

    const updated = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantityAvailable: { increment: qty },
        quantityReserved: { decrement: qty },
      },
    });

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

    return updated;
  }

  /**
   * Confirma reserva: debita reserved (pedido finalizado/enviado).
   * DEVE ser chamado dentro de uma transação Prisma existente.
   */
  async commitReservationInTransaction(
    variantId: string,
    qty: number,
    referenceId: string,
    tx: Prisma.TransactionClient
  ) {
    const item = await tx.inventoryItem.findUnique({
      where: { productVariantId: variantId },
    });
    if (!item) throw new NotFoundException("InventoryItem não encontrado");
    if (item.quantityReserved < qty) {
      throw new BadRequestException(
        `Reserva insuficiente para confirmar. Reservado: ${item.quantityReserved}, solicitado: ${qty}`
      );
    }

    const updated = await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantityReserved: { decrement: qty } },
    });

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

    return updated;
  }
}
