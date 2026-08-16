-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "withdrawal" REAL NOT NULL DEFAULT 0,
    "deposit" REAL NOT NULL DEFAULT 0,
    "balance" REAL,
    "note" TEXT,
    "bankStatementId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "anomalyFlags" TEXT NOT NULL DEFAULT '[]',
    "anomalyScore" REAL NOT NULL DEFAULT 0,
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_bankStatementId_fkey" FOREIGN KEY ("bankStatementId") REFERENCES "BankStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("balance", "bankStatementId", "createdAt", "date", "deposit", "description", "id", "note", "status", "updatedAt", "withdrawal") SELECT "balance", "bankStatementId", "createdAt", "date", "deposit", "description", "id", "note", "status", "updatedAt", "withdrawal" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX "Transaction_deposit_idx" ON "Transaction"("deposit");
CREATE INDEX "Transaction_bankStatementId_idx" ON "Transaction"("bankStatementId");
CREATE INDEX "Transaction_status_date_idx" ON "Transaction"("status", "date");
CREATE INDEX "Transaction_note_idx" ON "Transaction"("note");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
