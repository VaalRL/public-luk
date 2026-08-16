-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InvoiceReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "text" TEXT,
    "invoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceReminder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InvoiceReminder" ("createdAt", "date", "id", "invoiceId", "text", "updatedAt") SELECT "createdAt", "date", "id", "invoiceId", "text", "updatedAt" FROM "InvoiceReminder";
DROP TABLE "InvoiceReminder";
ALTER TABLE "new_InvoiceReminder" RENAME TO "InvoiceReminder";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
