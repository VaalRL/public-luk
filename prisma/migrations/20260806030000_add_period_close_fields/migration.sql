-- AlterTable
ALTER TABLE "BankStatement" ADD COLUMN "closedAt" DATETIME;
ALTER TABLE "BankStatement" ADD COLUMN "closedMonth" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "closedAt" DATETIME;
ALTER TABLE "Transaction" ADD COLUMN "closedMonth" TEXT;

-- CreateIndex
CREATE INDEX "BankStatement_closedMonth_idx" ON "BankStatement"("closedMonth");

-- CreateIndex
CREATE INDEX "Transaction_closedMonth_idx" ON "Transaction"("closedMonth");

