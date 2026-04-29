-- DropIndex
DROP INDEX IF EXISTS "OrderItem_snapshotSku_idx";
DROP INDEX IF EXISTS "OrderStatusHistory_status_idx";

-- AlterTable Order
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "cancelledAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdByUserId"   TEXT,
  ADD COLUMN IF NOT EXISTS "customerEmail"     TEXT,
  ADD COLUMN IF NOT EXISTS "customerName"      TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "customerPhone"     TEXT,
  ADD COLUMN IF NOT EXISTS "discountAmount"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "orderNumber"       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "paymentStatus"     "PaymentStatus" NOT NULL DEFAULT 'MANUAL_CONFIRMED',
  ADD COLUMN IF NOT EXISTS "shippingAddressJson" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "shippingAmount"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "subtotalAmount"    DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalAmount"       DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "Order"
  ALTER COLUMN "status" SET DEFAULT 'CONFIRMED',
  ALTER COLUMN "total" SET DEFAULT 0;

-- AlterTable OrderItem
ALTER TABLE "OrderItem"
  ADD COLUMN IF NOT EXISTS "customizationSnapshot" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "productId"             TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "productNameSnapshot"   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "skuSnapshot"           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "subtotalAmount"        DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unitPriceSnapshot"     DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "variantNameSnapshot"   TEXT NOT NULL DEFAULT '';

-- AlterTable OrderStatusHistory
ALTER TABLE "OrderStatusHistory"
  ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "fromStatus"      "OrderStatus",
  ADD COLUMN IF NOT EXISTS "reason"          TEXT,
  ADD COLUMN IF NOT EXISTS "toStatus"        "OrderStatus" NOT NULL DEFAULT 'CONFIRMED';

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_idx" ON "Order"("paymentStatus");
CREATE INDEX IF NOT EXISTS "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE INDEX IF NOT EXISTS "OrderItem_skuSnapshot_idx" ON "OrderItem"("skuSnapshot");
CREATE INDEX IF NOT EXISTS "OrderStatusHistory_toStatus_idx" ON "OrderStatusHistory"("toStatus");
