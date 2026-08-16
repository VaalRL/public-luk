-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT,
    "title" TEXT NOT NULL DEFAULT '報價單',
    "date" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL,
    "items" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unpaid',
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "companyId" TEXT NOT NULL,
    "providerId" TEXT,
    "templateId" TEXT NOT NULL DEFAULT 'default',
    "issueInvoice" BOOLEAN NOT NULL DEFAULT true,
    "bankAccountId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Company" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("amount", "bankAccountId", "companyId", "createdAt", "date", "id", "invoiceNumber", "issueInvoice", "items", "paidAmount", "providerId", "status", "taxAmount", "templateId", "totalAmount", "updatedAt") SELECT "amount", "bankAccountId", "companyId", "createdAt", "date", "id", "invoiceNumber", "issueInvoice", "items", "paidAmount", "providerId", "status", "taxAmount", "templateId", "totalAmount", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
