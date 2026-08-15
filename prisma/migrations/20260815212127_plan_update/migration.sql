/*
  Warnings:

  - A unique constraint covering the columns `[stripeProductId]` on the table `plan` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripePriceId]` on the table `plan` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "plan" ADD COLUMN     "stripePriceId" TEXT,
ADD COLUMN     "stripeProductId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripeProductId_key" ON "plan"("stripeProductId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_stripePriceId_key" ON "plan"("stripePriceId");
