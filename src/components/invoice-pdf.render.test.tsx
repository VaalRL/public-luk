// @vitest-environment node

/**
 * 端對端驗證：版型設定真的改到產出的 PDF
 *
 * 只驗證設定物件本身沒有意義 —— 要證明的是這份設定會落到實際印出來的檔案上。
 * 這裡真的把 PDF 產生成 buffer，解開內容串流後檢查文字與紙張尺寸。
 *
 * 註：Node 環境下 fontkit 無法解析專案用的 woff2 字型，因此把 pdf-fonts mock 成
 * PDF 內建的 Helvetica。字型不影響此處要驗證的標籤文字與版面尺寸，
 * 但 Helvetica 沒有中文字，所以測試中的自訂標籤一律使用 ASCII。
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import zlib from 'node:zlib';
import { renderToBuffer } from '@react-pdf/renderer';
import { defaultPdfTemplate, resolvePdfTemplate } from '@/lib/pdf-template';
import { sampleInvoiceForPreview } from '@/lib/pdf-template-sample';

vi.mock('@/lib/pdf-fonts', () => ({
    registerPdfFonts: () => { },
    PDF_FONT_FAMILY: 'Helvetica',
}));

/** 解開 PDF 內所有 Flate 串流，取出文字繪製指令中的字串 */
function extractText(pdf: Buffer): string {
    const chunks: string[] = [];
    const raw = pdf.toString('latin1');

    const streamRe = /stream\r?\n/g;
    let match: RegExpExecArray | null;
    while ((match = streamRe.exec(raw)) !== null) {
        const start = match.index + match[0].length;
        const end = raw.indexOf('endstream', start);
        if (end === -1) continue;
        try {
            const inflated = zlib.inflateSync(Buffer.from(raw.slice(start, end), 'latin1')).toString('latin1');
            chunks.push(inflated);
        } catch {
            // 不是壓縮串流（例如影像），略過
        }
    }

    const content = chunks.join('\n');

    // pdfkit 以 [<十六進位字串> 0] TJ 的形式輸出文字。
    // 標準字型（Helvetica）下十六進位就是字元碼，ASCII 可以直接還原；
    // 中文在子集化字型裡是 glyph id，還原不出來 —— 所以測試一律用 ASCII 標籤。
    return (content.match(/\[[^\]]*\]\s*TJ/g) ?? [])
        .map((op) =>
            (op.match(/<([0-9a-fA-F]*)>/g) ?? [])
                .map((hex) => Buffer.from(hex.slice(1, -1), 'hex').toString('latin1'))
                .join('')
        )
        .join('\n');
}

/** 從原始 PDF 讀出頁面尺寸 */
function mediaBox(pdf: Buffer): number[] | null {
    const m = pdf.toString('latin1').match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
    return m ? m.slice(1).map(Number) : null;
}

async function render(template = defaultPdfTemplate) {
    const { InvoicePdfDocument } = await import('./invoice-pdf');
    return await renderToBuffer(
        <InvoicePdfDocument invoice={sampleInvoiceForPreview} template={template} />
    );
}

describe('InvoicePdfDocument 套用版型設定', () => {
    it('預設版型輸出 A4', async () => {
        const box = mediaBox(await render());
        expect(box).not.toBeNull();
        expect(box![2]).toBeCloseTo(595.28, 1);
        expect(box![3]).toBeCloseTo(841.89, 1);
    }, 60_000);

    it('自訂標籤、金額符號與附註會出現在 PDF 上', async () => {
        const template = resolvePdfTemplate({
            labels: { grandTotal: 'TOTAL DUE:', subtotal: 'NET:', bankSection: 'REMIT TO' },
            options: { currencySymbol: 'NT$', footerNote: 'VALID FOR 30 DAYS' },
        });

        const text = extractText(await render(template));

        expect(text).toContain('TOTAL DUE:');
        expect(text).toContain('NET:');
        expect(text).toContain('REMIT TO');
        expect(text).toContain('VALID FOR 30 DAYS');
        // 金額符號換成 NT$ 後，總計 123,000 應該印成 NT$123,000
        expect(text).toContain('NT$123,000');
    }, 60_000);

    it('關掉的區塊不會印出來', async () => {
        const template = resolvePdfTemplate({
            labels: { tax: 'VAT:', bankSection: 'REMIT TO' },
            options: { showTaxRow: false, showBankAccounts: false, footerNote: 'KEEP ME' },
        });

        const text = extractText(await render(template));

        expect(text).not.toContain('VAT:');
        expect(text).not.toContain('REMIT TO');
        // 其他內容照印，確定不是整份空白
        expect(text).toContain('KEEP ME');
    }, 60_000);

    it('稅率由帳單金額反推，不是寫死的 5%', async () => {
        // 範例帳單服務小計 100,000、稅額 5,000 → 5%
        expect(extractText(await render())).toContain('(5%)');

        const tenPercent = {
            ...sampleInvoiceForPreview,
            taxAmount: 10000,
        };
        const { InvoicePdfDocument } = await import('./invoice-pdf');
        const buffer = await renderToBuffer(<InvoicePdfDocument invoice={tenPercent} />);
        expect(extractText(buffer)).toContain('(10%)');
    }, 60_000);

    it('紙張大小與日期格式可以改', async () => {
        const template = resolvePdfTemplate({
            layout: { pageSize: 'A5' },
            options: { dateFormat: 'yyyy-MM-dd' },
        });

        const pdf = await render(template);
        const box = mediaBox(pdf);
        expect(box![2]).toBeCloseTo(419.53, 1);
        expect(extractText(pdf)).toContain('2026-01-01');
    }, 60_000);

    it('簽章欄預設不印，打開後才出現', async () => {
        const off = extractText(await render(resolvePdfTemplate({
            labels: { signatureProvider: 'SELLER SIGN' },
        })));
        expect(off).not.toContain('SELLER SIGN');

        const on = extractText(await render(resolvePdfTemplate({
            labels: { signatureProvider: 'SELLER SIGN' },
            options: { showSignatures: true },
        })));
        expect(on).toContain('SELLER SIGN');
    }, 60_000);
});
