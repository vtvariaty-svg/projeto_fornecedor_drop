import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ─── Tenant & Admin ───────────────────────────────────────────────────────

  const tenant = await prisma.tenant.upsert({
    where: { slug: "loja-demo" },
    update: {},
    create: { name: "Loja Demo", slug: "loja-demo", status: "ACTIVE" },
  });

  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@drop.dev" },
    update: {},
    create: {
      name: "Admin Drop",
      email: "admin@drop.dev",
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  await prisma.tenantUser.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: {},
    create: { tenantId: tenant.id, userId: user.id, role: "TENANT_ADMIN", isActive: true },
  });

  // ─── Produtos de Exemplo ──────────────────────────────────────────────────

  const tote = await prisma.product.upsert({
    where: { slug: "bolsa-tote-premium" },
    update: {},
    create: {
      name: "Bolsa Tote Premium",
      slug: "bolsa-tote-premium",
      description: "Bolsa tote espaçosa em couro PU, ideal para o dia a dia.",
      status: "ACTIVE",
      category: "Bolsas",
      basePrice: 189.9,
      costPrice: 90.0,
    },
  });

  const clutch = await prisma.product.upsert({
    where: { slug: "clutch-verniz" },
    update: {},
    create: {
      name: "Clutch Verniz",
      slug: "clutch-verniz",
      description: "Clutch elegante em verniz, perfeita para ocasiões especiais.",
      status: "ACTIVE",
      category: "Clutches",
      basePrice: 129.9,
      costPrice: 55.0,
    },
  });

  const mochilaDraft = await prisma.product.upsert({
    where: { slug: "mochila-canvas" },
    update: {},
    create: {
      name: "Mochila Canvas",
      slug: "mochila-canvas",
      description: "Mochila em canvas resistente. Em breve.",
      status: "DRAFT",
      category: "Mochilas",
      basePrice: 219.9,
      costPrice: 110.0,
    },
  });

  // ─── Variantes (SKUs) ─────────────────────────────────────────────────────

  const variants = [
    {
      productId: tote.id,
      sku: "TOTE-PRETO-M",
      name: "Tote Preto M",
      color: "Preto",
      material: "Couro PU",
      size: "M",
      hardware: "Dourado",
      salePrice: 189.9,
      costPrice: 90.0,
      weightGrams: 450,
      status: "ACTIVE",
    },
    {
      productId: tote.id,
      sku: "TOTE-CARAMELO-M",
      name: "Tote Caramelo M",
      color: "Caramelo",
      material: "Couro PU",
      size: "M",
      hardware: "Prata",
      salePrice: 189.9,
      costPrice: 90.0,
      weightGrams: 450,
      status: "ACTIVE",
    },
    {
      productId: tote.id,
      sku: "TOTE-PRETO-G",
      name: "Tote Preto G",
      color: "Preto",
      material: "Couro PU",
      size: "G",
      hardware: "Dourado",
      salePrice: 219.9,
      costPrice: 105.0,
      weightGrams: 580,
      status: "ACTIVE",
    },
    {
      productId: clutch.id,
      sku: "CLUTCH-PRETO",
      name: "Clutch Verniz Preto",
      color: "Preto",
      material: "Verniz",
      size: "Único",
      hardware: "Dourado",
      salePrice: 129.9,
      costPrice: 55.0,
      weightGrams: 200,
      status: "ACTIVE",
    },
    {
      productId: clutch.id,
      sku: "CLUTCH-VINHO",
      name: "Clutch Verniz Vinho",
      color: "Vinho",
      material: "Verniz",
      size: "Único",
      hardware: "Dourado",
      salePrice: 129.9,
      costPrice: 55.0,
      weightGrams: 200,
      status: "INACTIVE",
    },
  ];

  for (const v of variants) {
    await prisma.productVariant.upsert({
      where: { sku: v.sku },
      update: {},
      create: v as Parameters<typeof prisma.productVariant.create>[0]["data"],
    });
  }

  // ─── Mídias ───────────────────────────────────────────────────────────────

  const existingMedia = await prisma.productMedia.count({ where: { productId: tote.id } });
  if (existingMedia === 0) {
    await prisma.productMedia.createMany({
      data: [
        {
          productId: tote.id,
          url: "https://placehold.co/800x800/1a1a1a/ffffff?text=Tote+Preto",
          altText: "Bolsa Tote Premium - Preto",
          sortOrder: 0,
        },
        {
          productId: tote.id,
          url: "https://placehold.co/800x800/c8a96e/ffffff?text=Tote+Caramelo",
          altText: "Bolsa Tote Premium - Caramelo",
          sortOrder: 1,
        },
      ],
    });
  }

  const existingClutchMedia = await prisma.productMedia.count({ where: { productId: clutch.id } });
  if (existingClutchMedia === 0) {
    await prisma.productMedia.createMany({
      data: [
        {
          productId: clutch.id,
          url: "https://placehold.co/800x800/1a1a1a/ffffff?text=Clutch+Preto",
          altText: "Clutch Verniz - Preto",
          sortOrder: 0,
        },
      ],
    });
  }

  // ─── Estoque Inicial ─────────────────────────────────────────────────────

  const stockMap: Record<string, number> = {
    "TOTE-PRETO-M":    50,
    "TOTE-CARAMELO-M": 30,
    "TOTE-PRETO-G":    20,
    "CLUTCH-PRETO":    15,
    "CLUTCH-VINHO":     0, // variante inativa, sem estoque
  };

  for (const [sku, qty] of Object.entries(stockMap)) {
    const variant = await prisma.productVariant.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (!variant) continue;

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { productVariantId: variant.id },
    });

    if (!existingItem) {
      const item = await prisma.inventoryItem.create({
        data: {
          productVariantId: variant.id,
          quantityAvailable: qty,
          quantityReserved: 0,
        },
      });
      if (qty > 0) {
        await prisma.inventoryMovement.create({
          data: {
            inventoryItemId: item.id,
            variantId: variant.id,
            type: "ADJUSTMENT_IN",
            quantity: qty,
            reason: "Estoque inicial de seed",
            referenceType: "SEED",
          },
        });
      }
      console.log(`   Estoque: ${sku} → ${qty} unidades`);
    }
  }

  console.log("✅ Seed concluído!");
  console.log(`   Tenant : ${tenant.slug}`);
  console.log(`   Usuário: ${user.email} / senha: Admin@123`);
  console.log(`   Produtos: Tote (3 SKUs), Clutch (2 SKUs), Mochila (draft)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

