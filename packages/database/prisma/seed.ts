import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "loja-demo" },
    update: {},
    create: {
      name: "Loja Demo",
      slug: "loja-demo",
      status: "ACTIVE",
    },
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
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: "TENANT_ADMIN",
      isActive: true,
    },
  });

  console.log("✅ Seed concluído!");
  console.log(`   Tenant : ${tenant.slug} (${tenant.id})`);
  console.log(`   Usuário: ${user.email} / senha: Admin@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
