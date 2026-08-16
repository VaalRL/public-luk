import { z } from "zod";

/**
 * Company Actions 驗證 Schema
 */

export const createCompanySchema = z.object({
    name: z.string().min(1, "公司名稱不可為空"),
    shortName: z.string().optional(),
    taxId: z.string().optional(),
    contactName: z.string().optional(),
    email: z.string().email("無效的電子郵件格式").optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    note: z.string().optional(),
    defaultInvoiceEnabled: z.boolean().default(false),
    logoPath: z.string().optional(),
    stampPath: z.string().optional(),
    bankAccounts: z.array(z.object({
        accountNumber: z.string().min(1, "帳號不可為空"),
        branch: z.string().optional(),
        accountHolder: z.string().optional(),
        currency: z.string().default("TWD"),
        note: z.string().optional(),
    })).optional(),
});

export const updateCompanySchema = createCompanySchema.partial();

export const addBankAccountSchema = z.object({
    companyId: z.string().uuid("無效的公司 ID"),
    accountNumber: z.string().min(1, "帳號不可為空"),
    branch: z.string().optional(),
    accountHolder: z.string().optional(),
    currency: z.string().default("TWD"),
    note: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type AddBankAccountInput = z.infer<typeof addBankAccountSchema>;
