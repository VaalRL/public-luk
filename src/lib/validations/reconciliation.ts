import { z } from "zod";

/**
 * Reconciliation Actions 驗證 Schema
 */

export const createReconciliationSchema = z.object({
    invoiceId: z.string().uuid("無效的帳單 ID"),
    transactionId: z.string().uuid("無效的交易 ID"),
    amount: z.number().positive("金額必須大於 0"),
    date: z.date().optional(),
});

export const updateTransactionSchema = z.object({
    id: z.string().uuid("無效的交易 ID"),
    date: z.date().optional(),
    description: z.string().optional(),
    note: z.string().optional(),
    status: z.enum(["matched", "partial", "unmatched", "manual"]).optional(),
    deposit: z.number().optional(),
});

export const autoMatchSchema = z.object({
    transactionIds: z.array(z.string().uuid("無效的交易 ID")),
});

export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type AutoMatchInput = z.infer<typeof autoMatchSchema>;
