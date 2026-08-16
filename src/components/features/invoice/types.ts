/**
 * Invoice Feature Types
 * 帳單管理相關的型別定義
 */

import { InvoiceItem } from "@/lib/validations/invoice";

export interface Company {
    id: string;
    name: string;
    shortName?: string | null;
    taxId?: string | null;
    contactName?: string | null;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
}

export interface Invoice {
    id: string;
    invoiceNumber: string | null;
    title: string;
    date: Date;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    status: string;
    paidAmount: number;
    items: string; // JSON string
    companyId: string;
    providerId?: string | null;
    templateId?: string;
    bankAccountId?: string | null;
    company?: Company;
    provider?: Company | null;
    reminders?: InvoiceReminder[];
}

export interface InvoiceReminder {
    id: string;
    date: Date;
    text?: string | null;
}

export interface ItemTemplate {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

export interface InvoiceTemplate {
    id: string;
    name: string;
}

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
    { id: "default", name: "預設模板 (標準)" },
    { id: "template-b", name: "模板 B (簡約)" },
];

export type { InvoiceItem };
