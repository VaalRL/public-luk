/**
 * 帳單金額的計算規則（唯一定義處）
 *
 * 欄位語意容易誤解，先講清楚：
 * - `amount`      只有「服務項目」的小計，**不含代墊費用**
 * - `taxAmount`   營業稅，只對服務項目課徵（代墊費用是代收代付，不課稅）
 * - `totalAmount` 客戶實際要付的總額 = 服務小計 + 稅 + 代墊費用
 *
 * 先前 createInvoice / updateInvoice 以 `amount + taxAmount` 當作 totalAmount，
 * 把代墊費用整段漏掉。由於對帳引擎用 totalAmount 判斷是否付清，
 * 客戶只付了不含代墊的金額就會被標記為結清，那筆代墊款再也收不回來。
 */

import type { InvoiceItem } from "@/lib/validations/invoice";

/** 服務項目小計（未稅） */
export function serviceSubtotal(items: InvoiceItem[]): number {
    return Math.round(
        items
            .filter((i) => !i.type || i.type === "service")
            .reduce((sum, i) => sum + (i.amount || 0), 0)
    );
}

/** 代墊費用小計（不課稅） */
export function reimbursementSubtotal(items: InvoiceItem[]): number {
    return Math.round(
        items
            .filter((i) => i.type === "reimbursement")
            .reduce((sum, i) => sum + (i.amount || 0), 0)
    );
}

/**
 * 客戶應付總額。
 *
 * @param amount     服務項目小計（未稅）
 * @param taxAmount  營業稅
 * @param items      全部品項，用來取出代墊費用
 */
export function invoiceTotal(amount: number, taxAmount: number, items: InvoiceItem[]): number {
    return Math.round(amount + taxAmount + reimbursementSubtotal(items));
}

/**
 * 由已儲存的金額反推稅率（%），用於顯示。
 * 稅率沒有單獨存欄位，但可由稅額與服務小計還原。
 */
export function derivedTaxRate(serviceAmount: number, taxAmount: number): number {
    if (serviceAmount <= 0) return 0;
    return Math.round((taxAmount / serviceAmount) * 1000) / 10;
}
