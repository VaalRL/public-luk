/**
 * 版型預覽用的範例帳單
 *
 * 設定頁的「預覽範例」用這份資料產生 PDF，讓使用者調版型時馬上看到結果，
 * 不必先儲存再回去下載真實帳單。
 *
 * 這裡的公司、統編、帳號全部是虛構的，不要換成真實客戶資料 ——
 * 這個檔案會進版控。統編刻意用 00000000 這種明顯無效的值。
 */

import type { PdfInvoice } from "@/types/invoice-pdf";

export const sampleInvoiceForPreview: PdfInvoice = {
    id: "preview",
    invoiceNumber: "範例20260101#01",
    title: "",
    date: new Date(2026, 0, 1),
    amount: 100000,
    taxAmount: 5000,
    totalAmount: 123000,
    issueInvoice: true,
    company: {
        name: "範例科技股份有限公司",
        taxId: "00000000",
        contactName: "王小明",
        phone: "02-0000-0000",
        address: "臺北市中正區範例路 1 號",
    },
    provider: {
        name: "示範顧問有限公司",
        taxId: "11111111",
        contactName: "李小華",
        phone: "02-1111-1111",
        email: "demo@example.com",
        address: "臺北市信義區示範街 2 號",
        bankAccounts: [
            {
                accountNumber: "000-000-000000",
                branch: "示範分行",
                accountHolder: "示範顧問有限公司",
                currency: "TWD",
                note: "示範銀行",
            },
        ],
    },
    items: [
        {
            type: "service",
            name: "顧問服務",
            content: "每月定期顧問",
            quantity: 2,
            price: 40000,
            amount: 80000,
            note: "",
        },
        {
            type: "service",
            name: "系統建置",
            content: "初期導入",
            quantity: 1,
            price: 20000,
            amount: 20000,
            note: "",
        },
        {
            type: "reimbursement",
            name: "規費代墊",
            content: "主管機關規費",
            quantity: 1,
            price: 18000,
            amount: 18000,
            note: "免稅",
        },
    ],
};
