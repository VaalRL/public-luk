// @vitest-environment node

/**
 * 回歸測試：帳單總額必須包含代墊費用
 *
 * 先前 createInvoice / updateInvoice 以 `amount + taxAmount` 當作 totalAmount，
 * 代墊費用整段被漏掉。由於自動對帳用 totalAmount 判斷是否付清，
 * 客戶只付了不含代墊的金額就會被標記為結清，那筆代墊款再也收不回來。
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createTestDb, type TestDb } from '@/test/db';

let db: TestDb;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({
    headers: vi.fn(async () => ({ get: vi.fn(() => '127.0.0.1') })),
}));
vi.mock('@/lib/prisma', () => ({
    get prisma() {
        return db.prisma;
    },
}));

beforeAll(async () => {
    db = await createTestDb();
}, 120_000);

afterAll(async () => {
    await db?.cleanup();
});

const prisma = () => db.prisma as PrismaClient;

const items = [
    { type: 'service' as const, name: '顧問服務', quantity: 1, price: 100000, amount: 100000 },
    { type: 'reimbursement' as const, name: '規費代墊', quantity: 1, price: 20000, amount: 20000 },
];

describe('createInvoice 的總額', () => {
    it('含代墊費用時，totalAmount 等於 服務 + 稅 + 代墊', async () => {
        const { createInvoice } = await import('./invoice');
        const co = await prisma().company.create({ data: { name: '代墊測試公司' } });

        const result = await createInvoice({
            companyId: co.id, date: new Date('2026-08-01'),
            amount: 100000, taxAmount: 5000, items,
        });
        expect(result.success).toBe(true);

        const invoice = await prisma().invoice.findFirstOrThrow({ where: { companyId: co.id } });
        expect(invoice.totalAmount).toBe(125000);
    }, 60_000);

    it('客戶付了含代墊的全額才算結清', async () => {
        const { createInvoice, recordManualPayment } = await import('./invoice');
        const co = await prisma().company.create({ data: { name: '結清判定公司' } });

        await createInvoice({
            companyId: co.id, date: new Date('2026-08-02'),
            amount: 100000, taxAmount: 5000, items,
        });
        const invoice = await prisma().invoice.findFirstOrThrow({ where: { companyId: co.id } });

        // 只付服務款＋稅（105,000）—— 還差代墊的 20,000，不該算結清
        await recordManualPayment({ invoiceId: invoice.id, amount: 105000, date: new Date() });
        let after = await prisma().invoice.findUniqueOrThrow({ where: { id: invoice.id } });
        expect(after.status).toBe('partial');

        // 補上代墊費用後才結清
        await recordManualPayment({ invoiceId: invoice.id, amount: 20000, date: new Date() });
        after = await prisma().invoice.findUniqueOrThrow({ where: { id: invoice.id } });
        expect(after.paidAmount).toBe(125000);
        expect(after.status).toBe('paid');
    }, 60_000);

    it('updateInvoice 調整品項後總額同步更新', async () => {
        const { createInvoice, updateInvoice } = await import('./invoice');
        const co = await prisma().company.create({ data: { name: '更新測試公司' } });

        await createInvoice({
            companyId: co.id, date: new Date('2026-08-03'),
            amount: 100000, taxAmount: 5000, items,
        });
        const invoice = await prisma().invoice.findFirstOrThrow({ where: { companyId: co.id } });

        // 代墊費用改為 30,000
        const updated = [
            items[0],
            { ...items[1], price: 30000, amount: 30000 },
        ];
        const r = await updateInvoice(invoice.id, {
            amount: 100000, taxAmount: 5000, items: updated,
        });
        expect(r.success).toBe(true);

        const after = await prisma().invoice.findUniqueOrThrow({ where: { id: invoice.id } });
        expect(after.totalAmount).toBe(135000);
    }, 60_000);
});
