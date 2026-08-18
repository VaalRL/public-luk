import { describe, it, expect } from 'vitest';
import {
    defaultPdfTemplate,
    resolvePdfTemplate,
    parsePdfTemplate,
    applyTaxRate,
    formatMoney,
    formatPdfDate,
    pdfTemplateInputSchema,
    pdfLabelGroups,
    type PdfLabelKey,
} from './pdf-template';

describe('pdf-template', () => {
    describe('resolvePdfTemplate', () => {
        it('沒有設定時回傳預設版型', () => {
            expect(resolvePdfTemplate(null)).toEqual(defaultPdfTemplate);
            expect(resolvePdfTemplate(undefined)).toEqual(defaultPdfTemplate);
            expect(resolvePdfTemplate('不是物件')).toEqual(defaultPdfTemplate);
        });

        it('只提供部分欄位時，其餘沿用預設值', () => {
            const t = resolvePdfTemplate({ labels: { grandTotal: '應付總額：' } });
            expect(t.labels.grandTotal).toBe('應付總額：');
            expect(t.labels.subtotal).toBe(defaultPdfTemplate.labels.subtotal);
            expect(t.layout).toEqual(defaultPdfTemplate.layout);
        });

        it('欄寬只改一欄時，其餘欄位不會消失', () => {
            const t = resolvePdfTemplate({ layout: { columnWidths: { note: 10 } } });
            expect(t.layout.columnWidths).toEqual(defaultPdfTemplate.layout.columnWidths);
        });

        // PDF 是要寄給客戶的，壞掉的設定不該讓單據產不出來
        it('區塊內容壞掉時只退回該區塊，其他設定保留', () => {
            const t = resolvePdfTemplate({
                labels: { grandTotal: '應付總額：' },
                layout: { baseFontSize: 999 },  // 超出允許範圍
            });
            expect(t.labels.grandTotal).toBe('應付總額：');
            expect(t.layout).toEqual(defaultPdfTemplate.layout);
        });

        it('欄寬總和不是 100 時整個版面退回預設', () => {
            const t = resolvePdfTemplate({
                layout: { columnWidths: { ...defaultPdfTemplate.layout.columnWidths, note: 50 } },
            });
            expect(t.layout.columnWidths).toEqual(defaultPdfTemplate.layout.columnWidths);
        });
    });

    describe('parsePdfTemplate', () => {
        it('JSON 壞掉時回傳預設版型', () => {
            expect(parsePdfTemplate('{ 不是 JSON')).toEqual(defaultPdfTemplate);
            expect(parsePdfTemplate(null)).toEqual(defaultPdfTemplate);
        });

        it('可以還原先前儲存的設定', () => {
            const saved = resolvePdfTemplate({ options: { currencySymbol: 'NT$' } });
            expect(parsePdfTemplate(JSON.stringify(saved)).options.currencySymbol).toBe('NT$');
        });
    });

    describe('pdfTemplateInputSchema', () => {
        it('欄寬總和不等於 100 會被擋下', () => {
            const r = pdfTemplateInputSchema.safeParse({
                layout: { columnWidths: { category: 10, name: 10, content: 10, quantity: 10, price: 10, total: 10, note: 10 } },
            });
            expect(r.success).toBe(false);
        });

        it('無效的日期格式會被擋下', () => {
            expect(pdfTemplateInputSchema.safeParse({ options: { dateFormat: 'YYYY' } }).success).toBe(false);
            expect(pdfTemplateInputSchema.safeParse({ options: { dateFormat: 'yyyy年M月d日' } }).success).toBe(true);
        });

        it('預設標題不可以是空的', () => {
            expect(pdfTemplateInputSchema.safeParse({ labels: { documentTitle: '' } }).success).toBe(false);
        });
    });

    describe('輔助函式', () => {
        it('applyTaxRate 代入稅率', () => {
            expect(applyTaxRate('營業稅 ({rate}%)：', 5)).toBe('營業稅 (5%)：');
            // 沒有佔位符就原樣輸出，讓使用者可以完全不顯示稅率
            expect(applyTaxRate('營業稅：', 5)).toBe('營業稅：');
        });

        it('formatMoney 使用設定的符號，且不四捨五入', () => {
            expect(formatMoney(1234, defaultPdfTemplate.options)).toBe('$1,234');
            expect(formatMoney(1234.5, { ...defaultPdfTemplate.options, currencySymbol: 'NT$' }))
                .toBe('NT$1,234.5');
        });

        it('formatPdfDate 使用設定的格式，格式壞掉時退回預設', () => {
            const d = new Date(2026, 7, 18);
            expect(formatPdfDate(d, defaultPdfTemplate.options)).toBe('2026/08/18');
            expect(formatPdfDate(d, { ...defaultPdfTemplate.options, dateFormat: 'yyyy-MM-dd' })).toBe('2026-08-18');
            expect(formatPdfDate(d, { ...defaultPdfTemplate.options, dateFormat: 'YYYY' })).toBe('2026/08/18');
        });
    });

    // 設定畫面是照著 pdfLabelGroups 產生的，漏掉一個鍵就等於那個標籤永遠改不到
    it('所有標籤都出現在設定畫面的分組中', () => {
        const grouped = pdfLabelGroups.flatMap((g) => g.keys).sort();
        const all = (Object.keys(defaultPdfTemplate.labels) as PdfLabelKey[]).sort();
        expect(grouped).toEqual(all);
    });
});
