/**
 * Reconciliation Feature Types
 * 對帳管理相關的型別定義
 */

import { Transaction as StoreTransaction } from "@/stores/reconciliation-store";
import { Invoice as StoreInvoice } from "@/stores/invoice-store";

export type Transaction = StoreTransaction;
export type Invoice = StoreInvoice;

export interface Overpayment {
    id: string;
    companyId: string;
    last5Digits: string;
    amount: number;
    month: string;
    description: string | null;
    company: {
        id: string;
        name: string;
        bankAccounts: {
            last5Digits: string;
        }[];
    };
}

export interface NotificationTemplate {
    type: string;
    template: string;
}
