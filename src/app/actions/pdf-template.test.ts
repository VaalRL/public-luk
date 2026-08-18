// @vitest-environment node

/**
 * 版型設定的儲存與讀取
 *
 * 重點在於「讀取端永遠拿得到一份可用的設定」：沒設定過、資料被改壞、
 * 只存了半套欄位，都必須退回預設值而不是讓報價單印不出來。
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { createTestDb, type TestDb } from '@/test/db';
import { defaultPdfTemplate, PDF_TEMPLATE_CONFIG_KEY } from '@/lib/pdf-template';

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

describe('PDF 版型設定', () => {
    it('沒設定過時回傳預設版型', async () => {
        const { getPdfTemplate } = await import('./pdf-template');
        expect(await getPdfTemplate()).toEqual(defaultPdfTemplate);
    }, 60_000);

    it('儲存後讀得回來，沒送的欄位補上預設值', async () => {
        const { getPdfTemplate, savePdfTemplate } = await import('./pdf-template');

        const result = await savePdfTemplate({
            labels: { grandTotal: '應付總額：', tax: '營業稅：' },
            options: { currencySymbol: 'NT$', showSignatures: true },
        });
        expect(result.success).toBe(true);

        const stored = await getPdfTemplate();
        expect(stored.labels.grandTotal).toBe('應付總額：');
        expect(stored.options.currencySymbol).toBe('NT$');
        expect(stored.options.showSignatures).toBe(true);
        // 第一次儲存時沒有既有設定，沒送的欄位補上預設值
        expect(stored.labels.subtotal).toBe(defaultPdfTemplate.labels.subtotal);
        expect(stored.layout).toEqual(defaultPdfTemplate.layout);
    }, 60_000);

    // 部分更新必須疊在已儲存的設定上。疊在預設值上的話，
    // 只想改附註的呼叫端會把使用者調過的所有標籤與版面洗掉。
    it('再次部分儲存時，不會洗掉先前存過的設定', async () => {
        const { getPdfTemplate, savePdfTemplate } = await import('./pdf-template');

        await savePdfTemplate({ options: { footerNote: '本報價單有效期 30 天。' } });

        const stored = await getPdfTemplate();
        expect(stored.options.footerNote).toBe('本報價單有效期 30 天。');
        // 上一個測試存的值必須還在
        expect(stored.labels.grandTotal).toBe('應付總額：');
        expect(stored.options.currencySymbol).toBe('NT$');
        expect(stored.options.showSignatures).toBe(true);
    }, 60_000);

    it('欄寬總和不等於 100 會被拒絕，且不影響已存的設定', async () => {
        const { getPdfTemplate, savePdfTemplate } = await import('./pdf-template');
        const before = await getPdfTemplate();

        const result = await savePdfTemplate({
            layout: {
                columnWidths: { category: 50, name: 50, content: 50, quantity: 50, price: 50, total: 50, note: 50 },
            },
        });

        expect(result.success).toBe(false);
        expect(await getPdfTemplate()).toEqual(before);
    }, 60_000);

    it('資料庫裡的設定被改壞時退回預設版型，不丟例外', async () => {
        const { getPdfTemplate } = await import('./pdf-template');

        await prisma().systemConfig.update({
            where: { key: PDF_TEMPLATE_CONFIG_KEY },
            data: { value: '{ 這不是 JSON' },
        });

        expect(await getPdfTemplate()).toEqual(defaultPdfTemplate);
    }, 60_000);

    it('還原預設值後設定被清除', async () => {
        const { getPdfTemplate, savePdfTemplate, resetPdfTemplate } = await import('./pdf-template');

        await savePdfTemplate({ labels: { grandTotal: '總額：' } });
        expect((await getPdfTemplate()).labels.grandTotal).toBe('總額：');

        const result = await resetPdfTemplate();
        expect(result.success).toBe(true);
        expect(await getPdfTemplate()).toEqual(defaultPdfTemplate);
        expect(await prisma().systemConfig.findUnique({ where: { key: PDF_TEMPLATE_CONFIG_KEY } })).toBeNull();
    }, 60_000);
});
