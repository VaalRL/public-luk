import { PrismaClient, Prisma } from '@prisma/client'
import * as fs from 'fs';
import * as path from 'path';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// 簡單的日誌函數
const logError = (msg: string) => {
    try {
        // 嘗試寫入到 APPDATA，如果失敗則寫入到當前目錄
        const appData = process.env.APPDATA || process.env.HOME || process.cwd();
        const logDir = path.join(appData, 'spreadsheet-comparator');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logPath = path.join(logDir, 'prisma-error.log');
        fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
    } catch {
        // 忽略日誌寫入錯誤
    }
};

/** 從未知型別的錯誤取出可讀訊息 */
const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

let prismaInstance: PrismaClient;
let schemaReadyPromise: Promise<void> | null = null;

try {
    logError(`Initializing Prisma with DATABASE_URL: ${process.env.DATABASE_URL}`);

    const prismaConfig: Prisma.PrismaClientOptions = {
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    };

    // 如果有 DATABASE_URL，明確傳遞給 Prisma
    if (process.env.DATABASE_URL) {
        prismaConfig.datasources = {
            db: {
                url: process.env.DATABASE_URL
            }
        };
    }

    prismaInstance = globalForPrisma.prisma ?? new PrismaClient(prismaConfig);
} catch (e: unknown) {
    logError(`Failed to initialize Prisma: ${errorMessage(e)}\n${e instanceof Error ? e.stack : ''}`);
    throw e;
}

// 確保既有資料庫包含最新欄位（避免舊版 DB 缺 column 造成 500）
const ensureDatabaseSchema = async (client: PrismaClient) => {
    const applyMissingColumns = async (tableName: string, requiredColumns: { name: string; type: string }[]) => {
        try {
            const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(
                `PRAGMA table_info("${tableName}")`
            );
            const existingNames = columns.map(c => c.name);

            for (const col of requiredColumns) {
                if (!existingNames.includes(col.name)) {
                    const stmt = `ALTER TABLE "${tableName}" ADD COLUMN "${col.name}" ${col.type}`;
                    try {
                        await client.$executeRawUnsafe(stmt);
                        logError(`Applied missing column on ${tableName}: ${stmt}`);
                    } catch (error: unknown) {
                        const message = errorMessage(error);
                        if (typeof message === 'string' && message.includes('duplicate column name')) {
                            logError(`Skipped applying column because it already exists: ${stmt}`);
                        } else {
                            throw error;
                        }
                    }
                }
            }
        } catch (error: unknown) {
            logError(`Failed to ensure ${tableName} schema: ${errorMessage(error)}`);
        }
    };

    // InvoiceReminder 表的缺失欄位
    await applyMissingColumns('InvoiceReminder', [
        { name: 'title', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
    ]);

    // ReconciliationRecord 表的缺失欄位 (overpaymentId 用於溢繳款項功能)
    await applyMissingColumns('ReconciliationRecord', [
        { name: 'overpaymentId', type: 'TEXT' },
    ]);

    // Transaction 表的缺失欄位 (anomaly detection 功能)
    await applyMissingColumns('Transaction', [
        { name: 'anomalyFlags', type: 'TEXT DEFAULT "[]"' },
        { name: 'anomalyScore', type: 'REAL DEFAULT 0' },
        { name: 'reviewStatus', type: 'TEXT DEFAULT "pending"' },
        // 結帳期別：月結改為標記而非刪除
        { name: 'closedMonth', type: 'TEXT' },
        { name: 'closedAt', type: 'DATETIME' },
    ]);

    // BankStatement 表的結帳期別欄位
    await applyMissingColumns('BankStatement', [
        { name: 'closedMonth', type: 'TEXT' },
        { name: 'closedAt', type: 'DATETIME' },
    ]);

    // Transaction.bankStatementId 需可為 NULL（手動記帳／資料修復的調整分錄沒有對帳單）。
    // 舊版資料庫是 NOT NULL，SQLite 無法 ALTER COLUMN，必須重建資料表。
    await relaxTransactionBankStatementNotNull(client);
};

/**
 * 將舊資料庫的 Transaction.bankStatementId 從 NOT NULL 放寬為可為 NULL。
 * 已經是 nullable 的資料庫會直接略過。
 */
const relaxTransactionBankStatementNotNull = async (client: PrismaClient) => {
    try {
        const columns = await client.$queryRawUnsafe<Array<{ name: string; notnull: number }>>(
            `PRAGMA table_info("Transaction")`
        );
        const column = columns.find(c => c.name === 'bankStatementId');

        // 資料表不存在或欄位已可為 NULL：不需處理
        if (!column || Number(column.notnull) === 0) {
            return;
        }

        logError('Rebuilding Transaction table to make bankStatementId nullable');

        await client.$executeRawUnsafe(`PRAGMA foreign_keys=OFF`);
        await client.$transaction([
            client.$executeRawUnsafe(`
                CREATE TABLE "new_Transaction" (
                    "id" TEXT NOT NULL PRIMARY KEY,
                    "date" DATETIME NOT NULL,
                    "description" TEXT,
                    "withdrawal" REAL NOT NULL DEFAULT 0,
                    "deposit" REAL NOT NULL DEFAULT 0,
                    "balance" REAL,
                    "note" TEXT,
                    "bankStatementId" TEXT,
                    "status" TEXT NOT NULL DEFAULT 'unmatched',
                    "anomalyFlags" TEXT NOT NULL DEFAULT '[]',
                    "anomalyScore" REAL NOT NULL DEFAULT 0,
                    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
                    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    "updatedAt" DATETIME NOT NULL,
                    CONSTRAINT "Transaction_bankStatementId_fkey" FOREIGN KEY ("bankStatementId")
                        REFERENCES "BankStatement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
                )
            `),
            client.$executeRawUnsafe(`
                INSERT INTO "new_Transaction" ("id", "date", "description", "withdrawal", "deposit",
                    "balance", "note", "bankStatementId", "status", "anomalyFlags", "anomalyScore",
                    "reviewStatus", "createdAt", "updatedAt")
                SELECT "id", "date", "description", "withdrawal", "deposit",
                    "balance", "note", "bankStatementId", "status", "anomalyFlags", "anomalyScore",
                    "reviewStatus", "createdAt", "updatedAt" FROM "Transaction"
            `),
            client.$executeRawUnsafe(`DROP TABLE "Transaction"`),
            client.$executeRawUnsafe(`ALTER TABLE "new_Transaction" RENAME TO "Transaction"`),
            client.$executeRawUnsafe(`CREATE INDEX "Transaction_date_idx" ON "Transaction"("date")`),
            client.$executeRawUnsafe(`CREATE INDEX "Transaction_status_idx" ON "Transaction"("status")`),
            client.$executeRawUnsafe(`CREATE INDEX "Transaction_deposit_idx" ON "Transaction"("deposit")`),
            client.$executeRawUnsafe(`CREATE INDEX "Transaction_bankStatementId_idx" ON "Transaction"("bankStatementId")`),
            client.$executeRawUnsafe(`CREATE INDEX "Transaction_status_date_idx" ON "Transaction"("status", "date")`),
            client.$executeRawUnsafe(`CREATE INDEX "Transaction_note_idx" ON "Transaction"("note")`),
        ]);
        await client.$executeRawUnsafe(`PRAGMA foreign_keys=ON`);

        logError('Transaction table rebuilt successfully');
    } catch (error: unknown) {
        logError(`Failed to relax Transaction.bankStatementId: ${errorMessage(error)}`);
    }
};

schemaReadyPromise = ensureDatabaseSchema(prismaInstance);

// 確保在匯出 prisma 之前完成一次資料庫欄位檢查
if (schemaReadyPromise) {
    await schemaReadyPromise.catch((error: unknown) => {
        logError(`Schema guard failed: ${errorMessage(error)}`);
    });
}

export const prisma = prismaInstance;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
