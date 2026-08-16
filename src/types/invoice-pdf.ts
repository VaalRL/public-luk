/**
 * PDF / 下載流程共用的帳單型別
 *
 * 這些元件接收的帳單來自不同來源（server action 的查詢結果、store 的狀態），
 * 欄位不完全一致，因此這裡描述的是「產生 PDF 實際需要的最小集合」。
 */

import type { InvoiceItem } from "@/lib/validations/invoice";

export type { InvoiceItem };

/** 出現在 PDF 上的公司資訊（買方或賣方） */
export interface PdfCompany {
    name: string;
    taxId?: string | null;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    logoPath?: string | null;
    stampPath?: string | null;
    bankAccounts?: PdfBankAccount[];
}

export interface PdfBankAccount {
    accountNumber?: string | null;
    branch?: string | null;
    accountHolder?: string | null;
    currency?: string | null;
    last5Digits?: string | null;
    /** 銀行名稱（歷史欄位命名） */
    note?: string | null;
}

/** 產生 PDF 所需的帳單欄位 */
export interface PdfInvoice {
    id: string;
    invoiceNumber?: string | null;
    title?: string | null;
    date: Date | string;
    amount?: number;
    taxAmount?: number;
    totalAmount: number;
    /** 資料庫中以 JSON 字串儲存，部分呼叫端會先解析成陣列 */
    items: string | InvoiceItem[];
    issueInvoice?: boolean;
    updatedAt?: Date | string;
    company?: PdfCompany | null;
    provider?: PdfCompany | null;
}

/** 把 items 欄位統一解析成陣列 */
export function parseInvoiceItems(items: string | InvoiceItem[]): InvoiceItem[] {
    if (Array.isArray(items)) return items;
    try {
        const parsed = JSON.parse(items);
        return Array.isArray(parsed) ? (parsed as InvoiceItem[]) : [];
    } catch {
        return [];
    }
}
