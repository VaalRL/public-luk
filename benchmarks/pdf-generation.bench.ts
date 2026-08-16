/**
 * PDF Generation Performance Benchmarks
 *
 * 執行方式: npm run bench
 */

import { bench, describe } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import React from 'react';

// 注意: 在基準測試中，我們需要動態導入組件以避免模組載入問題
// 這裡使用簡化版本進行測試

// 模擬發票資料生成器
function createMockInvoice(itemCount: number) {
    return {
        id: '1',
        invoiceNumber: 'INV-001',
        date: new Date('2025-01-01'),
        totalAmount: itemCount * 1000,
        taxAmount: itemCount * 50,
        updatedAt: new Date(),
        title: '報價單',
        company: {
            name: 'Test Company Limited',
            taxId: '12345678',
            contactName: 'John Doe',
            phone: '0900000001',
            address: 'Taipei, Taiwan',
        },
        provider: {
            name: '範例科技有限公司',
            taxId: '12345678',
            contactName: '王小明',
            email: 'contact@example.com',
            phone: '0900000000',
            address: '',
            logoPath: null,
            stampPath: null,
            bankAccounts: [
                {
                    currency: 'TWD',
                    note: '國泰世華銀行',
                    branch: '忠孝分行',
                    accountNumber: '123456789012',
                    accountHolder: '範例科技有限公司',
                    last5Digits: '89012',
                }
            ],
        },
        items: Array(itemCount).fill(null).map((_, i) => ({
            type: i % 10 === 0 ? 'reimbursement' : 'service',
            name: `測試項目 ${i + 1}`,
            content: `這是第 ${i + 1} 個測試項目的內容說明`,
            description: `詳細說明 ${i + 1}`,
            quantity: Math.floor(Math.random() * 10) + 1,
            price: Math.floor(Math.random() * 10000) + 1000,
            amount: 0, // 會在計算時填入
            note: i % 5 === 0 ? `備註 ${i + 1}` : '',
            category: i % 10 === 0 ? '代墊費用' : '服務項目',
        })).map(item => ({
            ...item,
            amount: item.quantity * item.price,
        })),
    };
}

describe('PDF Generation Performance', () => {
    // 注意: 實際的基準測試需要在瀏覽器環境中執行
    // 這裡提供測試框架，實際測試需要使用 Playwright 或 Puppeteer

    bench('create mock invoice data (5 items)', () => {
        createMockInvoice(5);
    });

    bench('create mock invoice data (20 items)', () => {
        createMockInvoice(20);
    });

    bench('create mock invoice data (50 items)', () => {
        createMockInvoice(50);
    });

    bench('create mock invoice data (100 items)', () => {
        createMockInvoice(100);
    });

    // 注意: 以下測試需要在瀏覽器環境中執行
    // 因為 @react-pdf/renderer 依賴瀏覽器 API

    // bench('generate PDF with 5 items', async () => {
    //     const invoice = createMockInvoice(5);
    //     await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    // });

    // bench('generate PDF with 20 items', async () => {
    //     const invoice = createMockInvoice(20);
    //     await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    // });

    // bench('generate PDF with 50 items', async () => {
    //     const invoice = createMockInvoice(50);
    //     await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    // });

    // bench('generate PDF with 100 items', async () => {
    //     const invoice = createMockInvoice(100);
    //     await pdf(<InvoicePdfDocument invoice={invoice} />).toBlob();
    // });
});

describe('Data Processing Performance', () => {
    bench('filter service items (5 items)', () => {
        const invoice = createMockInvoice(5);
        const items = invoice.items;
        items.filter(item => !item.type || item.type === 'service');
    });

    bench('filter service items (50 items)', () => {
        const invoice = createMockInvoice(50);
        const items = invoice.items;
        items.filter(item => !item.type || item.type === 'service');
    });

    bench('calculate totals (5 items)', () => {
        const invoice = createMockInvoice(5);
        const items = invoice.items;
        const serviceItems = items.filter(item => !item.type || item.type === 'service');
        const reimbursementItems = items.filter(item => item.type === 'reimbursement');

        const serviceSubtotal = serviceItems.reduce((sum, item) => sum + item.amount, 0);
        const serviceTax = Math.round(serviceSubtotal * 0.05);
        const serviceTotal = serviceSubtotal + serviceTax;
        const reimbursementTotal = reimbursementItems.reduce((sum, item) => sum + item.amount, 0);
        const grandTotal = serviceTotal + reimbursementTotal;
    });

    bench('calculate totals (50 items)', () => {
        const invoice = createMockInvoice(50);
        const items = invoice.items;
        const serviceItems = items.filter(item => !item.type || item.type === 'service');
        const reimbursementItems = items.filter(item => item.type === 'reimbursement');

        const serviceSubtotal = serviceItems.reduce((sum, item) => sum + item.amount, 0);
        const serviceTax = Math.round(serviceSubtotal * 0.05);
        const serviceTotal = serviceSubtotal + serviceTax;
        const reimbursementTotal = reimbursementItems.reduce((sum, item) => sum + item.amount, 0);
        const grandTotal = serviceTotal + reimbursementTotal;
    });
});

describe('Date Formatting Performance', () => {
    bench('format date with date-fns', async () => {
        const { format } = await import('date-fns');
        format(new Date(), 'yyyy/MM/dd');
    });

    bench('format date with native Intl', () => {
        new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
    });
});

describe('JSON Parsing Performance', () => {
    const invoice = createMockInvoice(20);
    const itemsString = JSON.stringify(invoice.items);

    bench('parse JSON items', () => {
        JSON.parse(itemsString);
    });

    bench('check type and parse if needed', () => {
        const items = typeof invoice.items === 'string'
            ? JSON.parse(invoice.items as any)
            : invoice.items;
    });
});

/**
 * 執行基準測試的說明:
 *
 * 1. 執行所有基準測試:
 *    npm run bench
 *
 * 2. 執行特定測試:
 *    npm run bench -- pdf-generation.bench.ts
 *
 * 3. 輸出結果到檔案:
 *    npm run bench > benchmark-results.txt
 *
 * 4. 比較不同版本的效能:
 *    - 在優化前執行並保存結果
 *    - 在優化後執行並比較
 *
 * 注意事項:
 * - PDF 生成測試需要在瀏覽器環境中執行
 * - 考慮使用 Playwright 或 Puppeteer 進行端到端測試
 * - 每個測試應執行多次以獲得穩定結果
 * - 在相同的硬體和網路條件下進行比較
 */
