/**
 * 整合測試用的暫存資料庫
 *
 * P0 的幾個帳務缺陷（外鍵違反、已付金額重複計算）只有在真的打到資料庫時才看得出來，
 * 用 mock 是抓不到的，所以這裡提供一個每個測試檔獨立的 SQLite 檔案。
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

export interface TestDb {
    prisma: PrismaClient;
    cleanup: () => Promise<void>;
}

/**
 * 建立一個套用了完整 migration 歷史的空資料庫。
 * 用 `migrate deploy` 而非 `db push`，這樣測試跑的就是實際會套用到正式資料庫的
 * migration，順便也能擋住「migration 歷史無法從零重放」這類問題。
 */
export async function createTestDb(): Promise<TestDb> {
    const dir = mkdtempSync(join(tmpdir(), "recon-test-"));
    const dbPath = join(dir, "test.db");
    const url = `file:${dbPath}`;

    execFileSync(
        "npx",
        ["prisma", "migrate", "deploy"],
        { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" }
    );

    const prisma = new PrismaClient({ datasources: { db: { url } } });

    return {
        prisma,
        cleanup: async () => {
            await prisma.$disconnect();
            rmSync(dir, { recursive: true, force: true });
        },
    };
}
