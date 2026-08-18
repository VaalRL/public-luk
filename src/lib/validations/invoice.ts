import { z } from "zod";

/**
 * 驗證訊息存的是「文案鍵」而不是成品字串。
 * schema 是模組層常數，client 與 server 共用，拿不到語言 context；
 * 由 withValidation 在伺服器端依請求語言翻成文字後才回傳。
 */

export const invoiceItemSchema = z.object({
    type: z.enum(["service", "reimbursement"]).optional(),
    category: z.string().optional(),
    name: z.string().min(1, "validation.itemNameRequired"),
    content: z.string().optional(),
    description: z.string().optional(), // Keeping for backward compatibility
    // 報價／請款品項不允許負值，否則會產生負金額的帳單
    quantity: z.number().min(0, "validation.quantityMin"),
    price: z.number().min(0, "validation.priceMin"),
    amount: z.number().min(0, "validation.amountMin"),
    note: z.string().optional(),
});

export const invoiceFormSchema = z.object({
    companyId: z.string().min(1, "validation.selectCustomer"),
    providerId: z.string().min(1, "validation.selectProvider"),
    date: z.date(),
    invoiceNumber: z.string().optional(),
    title: z.string().min(1, "validation.titleRequired"),
    items: z.array(invoiceItemSchema).min(1, "validation.itemsRequired"),
    taxRate: z.number().min(0).max(100),
    issueInvoice: z.boolean(),
    bankAccountId: z.string().optional(),
});

export const createInvoiceSchema = z.object({
    companyId: z.string().uuid("validation.invalidCompanyId"),
    providerId: z.string().uuid("validation.invalidProviderId").optional(),
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
    invoiceId: z.string().uuid("validation.invalidInvoiceId"),
    amount: z.number().positive("validation.amountPositive"),
    date: z.date(),
    note: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;
