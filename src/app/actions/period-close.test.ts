// @vitest-environment node

/**
 * 設計缺口的回歸測試
 *
 * 1. 月結不得刪除憑證 —— 舊實作刪掉所有 BankStatement / Transaction /
 *    ReconciliationRecord 卻保留 Invoice.paidAmount，製造出「有金額、沒憑證」
 *    的發票，並與 recalculateAllPaidAmounts 互相矛盾（會把已收款歸零）。
 *
 * 2. paidAmount 必須是唯一真相來源的衍生值 —— 任何寫入路徑之後，
 *    paidAmount 都要等於銷帳記錄總和。
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

/** 建立一張已透過銀行入帳付清的發票 */
async function paidInvoiceFromBankStatement(companyName: string, amount: number) {
    const company = await prisma().company.create({ data: { name: companyName } });
    const invoice = await prisma().invoice.create({
        data: {
            companyId: company.id, date: new Date('2026-01-01'), amount, taxAmount: 0,
            totalAmount: amount, items: '[]', status: 'unpaid', paidAmount: 0,
        },
    });
    const statement = await prisma().bankStatement.create({ data: { filename: `${companyName}.xlsx` } });
    const tx = await prisma().transaction.create({
        data: {
            bankStatementId: statement.id, date: new Date('2026-01-15'),
            deposit: amount, status: 'matched',
        },
    });
    await prisma().reconciliationRecord.create({
        data: { invoiceId: invoice.id, transactionId: tx.id, amount, date: new Date('2026-01-15') },
    });
    const { syncInvoiceBalance } = await import('@/lib/invoice-balance');
    await syncInvoiceBalance(prisma(), invoice.id);
    return { company, invoice, statement, tx };
}

describe('月結（saveReconciliationSnapshot）', () => {
    it('不得刪除交易、對帳單與銷帳記錄', async () => {
        const { saveReconciliationSnapshot } = await import('./snapshot');
        const { invoice, statement, tx } = await paidInvoiceFromBankStatement('保留憑證公司', 1000);

        await saveReconciliationSnapshot('2026-01');

        expect(await prisma().transaction.findUnique({ where: { id: tx.id } })).not.toBeNull();
        expect(await prisma().bankStatement.findUnique({ where: { id: statement.id } })).not.toBeNull();
        const records = await prisma().reconciliationRecord.findMany({ where: { invoiceId: invoice.id } });
        expect(records).toHaveLength(1);
    }, 60_000);

    it('把結算的交易標記為該期別', async () => {
        const { saveReconciliationSnapshot } = await import('./snapshot');
        const { tx } = await paidInvoiceFromBankStatement('標記期別公司', 500);

        await saveReconciliationSnapshot('2026-02');

        const after = await prisma().transaction.findUniqueOrThrow({ where: { id: tx.id } });
        expect(after.closedMonth).toBe('2026-02');
        expect(after.closedAt).not.toBeNull();
    }, 60_000);

    it('月結後執行 recalculateAllPaidAmounts 不會把已收款歸零', async () => {
        const { saveReconciliationSnapshot } = await import('./snapshot');
        const { recalculateAllPaidAmounts } = await import('./data-fix');
        const { invoice } = await paidInvoiceFromBankStatement('重算安全公司', 800);

        await saveReconciliationSnapshot('2026-03');
        await recalculateAllPaidAmounts();

        const after = await prisma().invoice.findUniqueOrThrow({ where: { id: invoice.id } });
        expect(after.paidAmount).toBe(800);
        expect(after.status).toBe('paid');
    }, 60_000);

    it('已結帳的交易不再出現在對帳工作區', async () => {
        const { saveReconciliationSnapshot, } = await import('./snapshot');
        const { getUnmatchedTransactions } = await import('./reconciliation');
        const { tx } = await paidInvoiceFromBankStatement('工作區過濾公司', 300);

        await saveReconciliationSnapshot('2026-04');

        const working = await getUnmatchedTransactions();
        expect(working.map(t => t.id)).not.toContain(tx.id);
    }, 60_000);
});

describe('paidAmount 單一真相來源', () => {
    it('手動記帳後 paidAmount 等於銷帳記錄總和', async () => {
        const { recordManualPayment } = await import('./invoice');
        const company = await prisma().company.create({ data: { name: '同步驗證公司' } });
        const invoice = await prisma().invoice.create({
            data: {
                companyId: company.id, date: new Date(), amount: 1000, taxAmount: 0,
                totalAmount: 1000, items: '[]', status: 'unpaid', paidAmount: 0,
            },
        });

        for (const amount of [200, 300]) {
            const r = await recordManualPayment({ invoiceId: invoice.id, amount, date: new Date() });
            expect(r.success).toBe(true);
        }

        const after = await prisma().invoice.findUniqueOrThrow({
            where: { id: invoice.id },
            include: { reconciliations: true },
        });
        const sum = after.reconciliations.reduce((s, r) => s + r.amount, 0);
        expect(after.paidAmount).toBe(sum);
        expect(after.paidAmount).toBe(500);
        expect(after.status).toBe('partial');
    }, 60_000);

    it('刪除銷帳記錄後重新同步，餘額隨之下降', async () => {
        const { syncInvoiceBalance } = await import('@/lib/invoice-balance');
        const { invoice } = await paidInvoiceFromBankStatement('沖銷回退公司', 600);

        expect((await prisma().invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe('paid');

        await prisma().reconciliationRecord.deleteMany({ where: { invoiceId: invoice.id } });
        const synced = await syncInvoiceBalance(prisma(), invoice.id);

        expect(synced).toEqual({ paidAmount: 0, status: 'unpaid' });
    }, 60_000);
});
