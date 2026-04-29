-- Passo 1: Adicionar valores ao enum OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_FULFILLMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'FULFILLMENT_IN_PROGRESS';

-- Passo 2: Adicionar valor ao enum PaymentStatus
ALTER TYPE "PaymentStatus" ADD VALUE 'MANUAL_CONFIRMED';
