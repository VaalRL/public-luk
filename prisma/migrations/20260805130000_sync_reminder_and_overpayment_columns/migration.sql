-- AlterTable
ALTER TABLE "InvoiceReminder" ADD COLUMN "description" TEXT;
ALTER TABLE "InvoiceReminder" ADD COLUMN "title" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReconciliationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invoiceId" TEXT NOT NULL,
    "transactionId" TEXT,
    "overpaymentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReconciliationRecord_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReconciliationRecord_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ReconciliationRecord_overpaymentId_fkey" FOREIGN KEY ("overpaymentId") REFERENCES "Overpayment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ReconciliationRecord" ("amount", "createdAt", "date", "id", "invoiceId", "transactionId", "updatedAt") SELECT "amount", "createdAt", "date", "id", "invoiceId", "transactionId", "updatedAt" FROM "ReconciliationRecord";
DROP TABLE "ReconciliationRecord";
ALTER TABLE "new_ReconciliationRecord" RENAME TO "ReconciliationRecord";
CREATE INDEX "ReconciliationRecord_invoiceId_idx" ON "ReconciliationRecord"("invoiceId");
CREATE INDEX "ReconciliationRecord_transactionId_idx" ON "ReconciliationRecord"("transactionId");
CREATE INDEX "ReconciliationRecord_overpaymentId_idx" ON "ReconciliationRecord"("overpaymentId");
CREATE INDEX "ReconciliationRecord_date_idx" ON "ReconciliationRecord"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

