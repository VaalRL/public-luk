import { z } from "zod";

export const invoiceItemSchema = z.object({
    type: z.enum(["service", "reimbursement"]).optional(),
    category: z.string().optional(),
    name: z.string().min(1, "品項名稱不可為空"),
    content: z.string().optional(),
    description: z.string().optional(), // Keeping for backward compatibility
    // 報價／請款品項不允許負值，否則會產生負金額的帳單
    quantity: z.number().min(0, "數量必須大於等於 0"),
    price: z.number().min(0, "單價必須大於等於 0"),
    amount: z.number().min(0, "金額必須大於等於 0"),
    note: z.string().optional(),
});

export const invoiceFormSchema = z.object({
    companyId: z.string().min(1, "請選擇客戶公司"),
    providerId: z.string().min(1, "請選擇開立公司 (乙方)"),
    date: z.date(),
    invoiceNumber: z.string().optional(),
    title: z.string().min(1, "請輸入文件標題"),
    items: z.array(invoiceItemSchema).min(1, "至少需要一個品項"),
    taxRate: z.number().min(0).max(100),
    issueInvoice: z.boolean(),
    bankAccountId: z.string().optional(),
});

export const createInvoiceSchema = z.object({
    companyId: z.string().uuid("無效的公司 ID"),
    providerId: z.string().uuid("無效的提供者 ID").optional(),
    date: z.date(),
    amount: z.number(),
    taxAmount: z.number(),
    items: z.array(invoiceItemSchema),
    invoiceNumber: z.string().optional(),
    title: z.string().optional(),
    issueInvoice: z.boolean().optional(),
    reminders: z.array(z.object({
        date: z.date(),
        text: z.string().optional()
    })).optional(),
    bankAccountId: z.string().optional(),
});

export const updateInvoiceSchema = createInvoiceSchema.partial().extend({
    // paidAmount should NOT be updated directly via updateInvoice
});

export const recordManualPaymentSchema = z.object({
    invoiceId: z.string().uuid("無效的帳單 ID"),
    amount: z.number().positive("金額必須大於 0"),
    date: z.date(),
    note: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;
