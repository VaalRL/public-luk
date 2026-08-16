/**
 * Company Feature Types
 * 公司管理相關的型別定義
 */

export interface BankAccount {
    id: string;
    accountNumber: string;
    branch?: string | null;
    accountHolder?: string | null;
    currency: string;
    note?: string | null;
    last5Digits: string;
}

export interface Company {
    id: string;
    name: string;
    shortName: string | null;
    taxId: string | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    note: string | null;
    defaultInvoiceEnabled: boolean | null;
    logoPath: string | null;
    stampPath: string | null;
    bankAccounts: BankAccount[];
    _count?: {
        clientInvoices: number;
    };
}

export interface CompanyFormData {
    name: string;
    shortName: string;
    taxId: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    note: string;
    defaultInvoiceEnabled: boolean;
    logoPath: string;
    stampPath: string;
}

export interface BankAccountFormData {
    accountNumber: string;
    branch: string;
    accountHolder: string;
    currency: string;
    note: string;
}
