// @vitest-environment node

/**
 * P0 帳務缺陷的回歸測試（打真實 SQLite）
 *
 * 涵蓋審查中發現的四個問題：
 *  1. recordManualPayment 用不存在的 bankStatementId "manual" -> 外鍵違反，功能完全不能用
 *  2. recordManualPayment 把新建立的銷帳金額加了兩次 -> 付一半就被標記為 paid
 *  3. autoMatchTransactions 竄改共用的 Set -> 同一筆入帳被兩家公司認領
 *  4. fixPaidAmountDiscrepancies 用 "manual-fix" -> 同樣外鍵違反，永遠修不了東西
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

async function makeInvoice(totalAmount: number, companyName = 'Acme') {
    const company = await prisma().company.create({ data: { name: companyName } });
    const invoice = await prisma().invoice.create({
        data: {
            companyId: company.id,
            date: new Date('2026-01-01'),
            amount: totalAmount,
            taxAmount: 0,
            totalAmount,
            items: '[]',
            status: 'unpaid',
            paidAmount: 0,
        },
    });
    return { company, invoice };
}

describe('recordManualPayment', () => {
    it('沒有銀行對帳單也能建立付款（不得因外鍵違反而失敗）', async () => {
        const { recordManualPayment } = await import('./invoice');
        const { invoice } = await makeInvoice(1000);

        const result = await recordManualPayment({
            invoiceId: invoice.id,
            amount: 400,
            date: new Date('2026-02-01'),
            note: '現金',
        });

        expect(result.success).toBe(true);

        const tx = await prisma().transaction.findFirst({
            where: { id: (result as { success: true; data: { transactionId: string | null } }).data.transactionId! },
        });
        expect(tx?.bankStatementId).toBeNull();
    });

    it('付一部分時已付金額不得灌水，狀態要是 partial', async () => {
        const { recordManualPayment } = await import('./invoice');
        const { invoice } = await makeInvoice(1000);

        const result = await recordManualPayment({
            invoiceId: invoice.id,
            amount: 500,
            date: new Date('2026-02-01'),
        });
        expect(result.success).toBe(true);

        const updated = await prisma().invoice.findUniqueOrThrow({ where: { id: invoice.id } });
        expect(updated.paidAmount).toBe(500);
        expect(updated.status).toBe('partial');
    });

    it('多次付款累加正確，付滿才轉為 paid', async () => {
        const { recordManualPayment } = await import('./invoice');
        const { invoice } = await makeInvoice(1000);

        for (const amount of [300, 300, 400]) {
            const r = await recordManualPayment({ invoiceId: invoice.id, amount, date: new Date('2026-02-01') });
            expect(r.success).toBe(true);
        }

        const updated = await prisma().invoice.findUniqueOrThrow({ where: { id: invoice.id } });
        expect(updated.paidAmount).toBe(1000);
        expect(updated.status).toBe('paid');

        const records = await prisma().reconciliationRecord.findMany({ where: { invoiceId: invoice.id } });
        expect(records.reduce((s, r) => s + r.amount, 0)).toBe(1000);
    });

    it('已付金額必須等於銷帳記錄總和', async () => {
        const { recordManualPayment } = await import('./invoice');
        const { invoice } = await makeInvoice(800);

        await recordManualPayment({ invoiceId: invoice.id, amount: 250, date: new Date('2026-02-01') });

        const updated = await prisma().invoice.findUniqueOrThrow({
            where: { id: invoice.id },
            include: { reconciliations: true },
        });
        const sum = updated.reconciliations.reduce((s, r) => s + r.amount, 0);
        expect(updated.paidAmount).toBe(sum);
    });
});

describe('fixPaidAmountDiscrepancies', () => {
    it('真的補上缺漏的銷帳記錄，而不是靜默失敗回報 0 筆', async () => {
        const { fixPaidAmountDiscrepancies } = await import('./data-fix');
        const { invoice } = await makeInvoice(1000, 'FixCo');

        // 製造出 paidAmount 有值、但沒有對應銷帳記錄的不一致狀態
        await prisma().invoice.update({
            where: { id: invoice.id },
            data: { paidAmount: 600, status: 'partial' },
        });

        const result = await fixPaidAmountDiscrepancies();

        expect(result.totalFailed).toBe(0);
        expect(result.totalFixed).toBeGreaterThanOrEqual(1);

        const after = await prisma().invoice.findUniqueOrThrow({
            where: { id: invoice.id },
            include: { reconciliations: true },
        });
        expect(after.reconciliations.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(600, 2);
    });
});

describe('autoMatchTransactions', () => {
    it('共用帳號歸戶給 A 之後，B 不得再認領同一筆入帳', async () => {
        const { autoMatchTransactions } = await import('./reconciliation');

        const companyA = await prisma().company.create({ data: { name: 'CompanyA' } });
        const companyB = await prisma().company.create({ data: { name: 'CompanyB' } });

        // 11111 由 A、B 共用；22222 只屬於 B
        await prisma().bankAccount.create({
            data: { accountNumber: 'A-11111', last5Digits: '11111', companyId: companyA.id },
        });
        await prisma().bankAccount.create({
            data: { accountNumber: 'B-11111', last5Digits: '11111', companyId: companyB.id },
        });
        await prisma().bankAccount.create({
            data: { accountNumber: 'B-22222', last5Digits: '22222', companyId: companyB.id },
        });

        // 只有 A 有未結帳單 -> 11111 應歸戶給 A
        await prisma().invoice.create({
            data: {
                companyId: companyA.id, date: new Date('2026-01-01'), amount: 1000, taxAmount: 0,
                totalAmount: 1000, items: '[]', status: 'unpaid', paidAmount: 0,
            },
        });

        const statement = await prisma().bankStatement.create({ data: { filename: 'test.xlsx' } });
        const tx1 = await prisma().transaction.create({
            data: {
                bankStatementId: statement.id, date: new Date('2026-02-01'),
                deposit: 1000, note: '匯款 11111', status: 'unmatched',
            },
        });
        const tx2 = await prisma().transaction.create({
            data: {
                bankStatementId: statement.id, date: new Date('2026-02-02'),
                deposit: 500, note: '匯款 22222', status: 'unmatched',
            },
        });

        const result = await autoMatchTransactions({ transactionIds: [tx1.id, tx2.id] });
        expect(result.success).toBe(true);

        // tx1 的 1000 元只能被沖銷一次
        const tx1Records = await prisma().reconciliationRecord.findMany({ where: { transactionId: tx1.id } });
        expect(tx1Records.reduce((s, r) => s + r.amount, 0)).toBeLessThanOrEqual(1000);

        // 關鍵回歸點：B 不得因為共用帳號被歸戶給 A 就拿到 tx1 的錢當溢繳
        const bOverpayments = await prisma().overpayment.findMany({ where: { companyId: companyB.id } });
        const bCredit = bOverpayments.reduce((s, o) => s + o.amount, 0);
        expect(bCredit).toBeLessThanOrEqual(500);

        // 全系統的銷帳 + 溢繳總額不得超過實際入帳總額 (1000 + 500)
        const allRecords = await prisma().reconciliationRecord.findMany();
        const allOverpayments = await prisma().overpayment.findMany();
        const accountedFor =
            allRecords.filter(r => r.transactionId === tx1.id || r.transactionId === tx2.id)
                .reduce((s, r) => s + r.amount, 0) +
            allOverpayments.reduce((s, o) => s + o.amount, 0);
        expect(accountedFor).toBeLessThanOrEqual(1500);
    }, 60_000);

    it('多家公司都有未結帳款的共用帳號標記為 ambiguous', async () => {
        const { autoMatchTransactions } = await import('./reconciliation');

        const c1 = await prisma().company.create({ data: { name: 'Shared1' } });
        const c2 = await prisma().company.create({ data: { name: 'Shared2' } });

        for (const [company, acct] of [[c1, 'S1-33333'], [c2, 'S2-33333']] as const) {
            await prisma().bankAccount.create({
                data: { accountNumber: acct, last5Digits: '33333', companyId: company.id },
            });
            await prisma().invoice.create({
                data: {
                    companyId: company.id, date: new Date('2026-01-01'), amount: 500, taxAmount: 0,
                    totalAmount: 500, items: '[]', status: 'unpaid', paidAmount: 0,
                },
            });
        }

        const statement = await prisma().bankStatement.create({ data: { filename: 'shared.xlsx' } });
        const tx = await prisma().transaction.create({
            data: {
                bankStatementId: statement.id, date: new Date('2026-02-01'),
                deposit: 500, note: '匯款 33333', status: 'unmatched',
            },
        });

        const result = await autoMatchTransactions({ transactionIds: [tx.id] });
        expect(result.success).toBe(true);

        const after = await prisma().transaction.findUniqueOrThrow({ where: { id: tx.id } });
        expect(after.status).toBe('ambiguous');
    }, 60_000);
});
