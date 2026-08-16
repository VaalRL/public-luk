/**
 * 發票已付金額的唯一同步點
 *
 * `Invoice.paidAmount` 是衍生值 —— 它永遠應該等於該發票所有銷帳記錄的總和。
 * 但它被存成獨立欄位，先前由五個不同的地方各自維護，任何一處算錯就會產生
 * 「金額與憑證對不上」的帳。程式碼審查中發現的三個 P0 缺陷（重複計算、
 * 重複認領、修復工具失效）全部源自這個重複的真相來源。
 *
 * 因此：**任何會改動銷帳記錄的流程，都必須改用這裡的函式來更新發票餘額**，
 * 不要自己算 paidAmount。
 */

import { Prisma } from "@prisma/client";

/** 可以是 PrismaClient 本身，也可以是 $transaction 內的 client */
export type PrismaLike = Prisma.TransactionClient;

/** 金額比較的容差。金額以 Float 儲存，直接用 === 比較不可靠。 */
export const AMOUNT_EPSILON = 0.01;

export type InvoiceStatus = "unpaid" | "partial" | "paid";

/**
 * 依已付金額與總額決定發票狀態。
 * 用容差比較，避免浮點誤差讓「剛好付清」被判成 partial。
 */
export function resolveInvoiceStatus(totalAmount: number, paidAmount: number): InvoiceStatus {
    if (paidAmount >= totalAmount - AMOUNT_EPSILON) return "paid";
    if (paidAmount > AMOUNT_EPSILON) return "partial";
    return "unpaid";
}

/**
 * 依銷帳記錄重新計算並寫回發票的已付金額與狀態。
 *
 * 這是唯一應該寫入 `paidAmount` 的地方。呼叫前請確保銷帳記錄已經寫入
 * （在同一個 transaction 內也可以，傳入該 transaction client 即可）。
 *
 * @returns 更新後的已付金額與狀態；發票不存在時回傳 null
 */
export async function syncInvoiceBalance(
    client: PrismaLike,
    invoiceId: string
): Promise<{ paidAmount: number; status: InvoiceStatus } | null> {
    const invoice = await client.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, totalAmount: true },
    });

    if (!invoice) return null;

    const aggregate = await client.reconciliationRecord.aggregate({
        where: { invoiceId },
        _sum: { amount: true },
    });

    const paidAmount = aggregate._sum.amount ?? 0;
    const status = resolveInvoiceStatus(invoice.totalAmount, paidAmount);

    await client.invoice.update({
        where: { id: invoiceId },
        data: { paidAmount, status },
    });

    return { paidAmount, status };
}

/**
 * 一次同步多張發票（自動對帳會一次影響多張）。
 */
export async function syncInvoiceBalances(
    client: PrismaLike,
    invoiceIds: Iterable<string>
): Promise<void> {
    for (const id of new Set(invoiceIds)) {
        await syncInvoiceBalance(client, id);
    }
}
