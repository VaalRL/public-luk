import { describe, it, expect } from 'vitest';
import { serviceSubtotal, reimbursementSubtotal, invoiceTotal, derivedTaxRate } from './invoice-total';
import type { InvoiceItem } from '@/lib/validations/invoice';

const item = (over: Partial<InvoiceItem>): InvoiceItem => ({
    name: '項目', quantity: 1, price: 0, amount: 0, ...over,
} as InvoiceItem);

describe('invoice-total', () => {
    describe('小計', () => {
        it('沒有 type 的品項視為服務項目（相容舊資料）', () => {
            expect(serviceSubtotal([item({ amount: 1000 })])).toBe(1000);
        });

        it('服務與代墊分開計算', () => {
            const items = [
                item({ type: 'service', amount: 100000 }),
                item({ type: 'reimbursement', amount: 20000 }),
                item({ type: 'service', amount: 5000 }),
            ];
            expect(serviceSubtotal(items)).toBe(105000);
            expect(reimbursementSubtotal(items)).toBe(20000);
        });

        it('沒有代墊項目時為 0', () => {
            expect(reimbursementSubtotal([item({ type: 'service', amount: 100 })])).toBe(0);
        });
    });

    describe('invoiceTotal', () => {
        // 這是先前漏掉代墊費用的地方：對帳引擎用 totalAmount 判斷是否付清，
        // 少算代墊費用會讓客戶只付服務款就被標記為結清。
        it('總額必須包含代墊費用', () => {
            const items = [
                item({ type: 'service', amount: 100000 }),
                item({ type: 'reimbursement', amount: 20000 }),
            ];
            expect(invoiceTotal(100000, 5000, items)).toBe(125000);
        });

        it('沒有代墊費用時等於服務小計加稅', () => {
            const items = [item({ type: 'service', amount: 100000 })];
            expect(invoiceTotal(100000, 5000, items)).toBe(105000);
        });

        it('未開發票（稅為 0）也要算進代墊費用', () => {
            const items = [
                item({ type: 'service', amount: 80000 }),
                item({ type: 'reimbursement', amount: 12000 }),
            ];
            expect(invoiceTotal(80000, 0, items)).toBe(92000);
        });
    });

    describe('derivedTaxRate', () => {
        it('由已儲存的金額反推稅率', () => {
            expect(derivedTaxRate(100000, 5000)).toBe(5);
            expect(derivedTaxRate(100000, 10000)).toBe(10);
        });

        it('未課稅時為 0', () => {
            expect(derivedTaxRate(100000, 0)).toBe(0);
        });

        it('服務小計為 0 時不除以零', () => {
            expect(derivedTaxRate(0, 0)).toBe(0);
        });

        it('保留一位小數', () => {
            expect(derivedTaxRate(30000, 750)).toBe(2.5);
        });
    });
});
