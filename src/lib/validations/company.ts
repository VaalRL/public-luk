import { z } from "zod";

/**
 * 驗證訊息存的是「文案鍵」而不是成品字串。
 * schema 是模組層常數，client 與 server 共用，拿不到語言 context；
 * 由 withValidation 在伺服器端依請求語言翻成文字後才回傳。
 */

/**
 * Company Actions 驗證 Schema
 */

export const createCompanySchema = z.object({
    name: z.string().min(1, "validation.companyNameRequired"),
    shortName: z.string().optional(),
    taxId: z.string().optional(),
    contactName: z.string().optional(),
    email: z.string().email("validation.invalidEmail").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    note: z.string().optional(),
    defaultInvoiceEnabled: z.boolean().default(false),
    logoPath: z.string().optional(),
    stampPath: z.string().optional(),
    bankAccounts: z.array(z.object({
        accountNumber: z.string().min(1, "validation.accountRequired"),
        branch: z.string().optional(),
        accountHolder: z.string().optional(),
        currency: z.string().default("TWD"),
        note: z.string().optional(),
    })).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const addBankAccountSchema = z.object({
    companyId: z.string().uuid("validation.invalidCompanyId"),
    accountNumber: z.string().min(1, "validation.accountRequired"),
    branch: z.string().optional(),
    accountHolder: z.string().optional(),
    currency: z.string().default("TWD"),
    note: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
