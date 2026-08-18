import { z } from "zod";

/**
 * 驗證訊息存的是「文案鍵」而不是成品字串。
 * schema 是模組層常數，client 與 server 共用，拿不到語言 context；
 * 由 withValidation 在伺服器端依請求語言翻成文字後才回傳。
 */

/**
 * Reconciliation Actions 驗證 Schema
 */

export const createReconciliationSchema = z.object({
    invoiceId: z.string().uuid("validation.invalidInvoiceId"),
    transactionId: z.string().uuid("validation.invalidTransactionId"),
    amount: z.number().positive("validation.amountPositive"),
    date: z.date().optional(),
});

export const updateTransactionSchema = z.object({
    id: z.string().uuid("validation.invalidTransactionId"),
    date: z.date().optional(),
    description: z.string().optional(),
    note: z.string().optional(),
    status: z.enum(["matched", "partial", "unmatched", "manual"]).optional(),
    deposit: z.number().optional(),
});

export const autoMatchSchema = z.object({
    transactionIds: z.array(z.string().uuid("validation.invalidTransactionId")),
});

export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type AutoMatchInput = z.infer<typeof autoMatchSchema>;
