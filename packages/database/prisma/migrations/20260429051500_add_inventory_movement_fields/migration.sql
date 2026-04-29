-- AlterEnum
BEGIN;
CREATE TYPE "InventoryMovementType_new" AS ENUM ('ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RESERVATION', 'RELEASE_RESERVATION', 'COMMIT_RESERVATION', 'MANUAL_CORRECTION', 'RETURN');
ALTER TABLE "InventoryMovement" ALTER COLUMN "type" TYPE "InventoryMovementType_new" USING ("type"::text::"InventoryMovementType_new");
ALTER TYPE "InventoryMovementType" RENAME TO "InventoryMovementType_old";
ALTER TYPE "InventoryMovementType_new" RENAME TO "InventoryMovementType";
DROP TYPE "InventoryMovementType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "InventoryMovement" DROP CONSTRAINT "InventoryMovement_orderId_fkey";

-- DropIndex
DROP INDEX "InventoryMovement_orderId_idx";

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "InventoryMovement" DROP COLUMN "orderId",
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "referenceId" TEXT,
ADD COLUMN "referenceType" TEXT,
ADD COLUMN "variantId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryMovement_variantId_idx" ON "InventoryMovement"("variantId");

-- CreateIndex
CREATE INDEX "InventoryMovement_type_idx" ON "InventoryMovement"("type");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdByUserId_idx" ON "InventoryMovement"("createdByUserId");
