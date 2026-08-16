import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Invoice Store
 * 管理帳單相關的全域狀態
 */

// Types
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
    items: string;
    companyId: string;
    providerId?: string | null;
    templateId?: string;
    issueInvoice?: boolean;
    bankAccountId?: string | null;
    company?: {
        id: string;
        name: string;
        bankAccounts?: {
            last5Digits: string;
        }[];
    };
    provider?: {
        id: string;
        name: string;
    } | null;
    reminders?: Array<{
        id: string;
        date: Date;
        text?: string | null;
    }>;
}

interface InvoiceState {
    // State
    invoices: Invoice[];
    currentInvoice: Invoice | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setInvoices: (invoices: Invoice[]) => void;
    setCurrentInvoice: (invoice: Invoice | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;

    // CRUD Operations
    addInvoice: (invoice: Invoice) => void;
    updateInvoice: (id: string, updates: Partial<Invoice>) => void;
    deleteInvoice: (id: string) => void;

    // Utility
    getInvoiceById: (id: string) => Invoice | undefined;
    getUnpaidInvoices: () => Invoice[];
    getInvoicesByCompany: (companyId: string) => Invoice[];

    // Reset
    reset: () => void;
}

const initialState = {
    invoices: [],
    currentInvoice: null,
    isLoading: false,
    error: null,
};

export const useInvoiceStore = create<InvoiceState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Actions
            setInvoices: (invoices) => set({ invoices, error: null }),

            setCurrentInvoice: (invoice) => set({ currentInvoice: invoice }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error, isLoading: false }),

            // CRUD Operations
            addInvoice: (invoice) =>
                set((state) => ({
                    invoices: [...state.invoices, invoice],
                    error: null,
                })),

            updateInvoice: (id, updates) =>
                set((state) => ({
                    invoices: state.invoices.map((inv) =>
                        inv.id === id ? { ...inv, ...updates } : inv
                    ),
                    currentInvoice:
                        state.currentInvoice?.id === id
                            ? { ...state.currentInvoice, ...updates }
                            : state.currentInvoice,
                    error: null,
                })),

            deleteInvoice: (id) =>
                set((state) => ({
                    invoices: state.invoices.filter((inv) => inv.id !== id),
                    currentInvoice:
                        state.currentInvoice?.id === id ? null : state.currentInvoice,
                    error: null,
                })),

            // Utility
            getInvoiceById: (id) => {
                return get().invoices.find((inv) => inv.id === id);
            },

            getUnpaidInvoices: () => {
                return get().invoices.filter(
                    (inv) => inv.status !== 'paid' && inv.paidAmount < inv.totalAmount
                );
            },

            getInvoicesByCompany: (companyId) => {
                return get().invoices.filter((inv) => inv.companyId === companyId);
            },

            // Reset
            reset: () => set(initialState),
        }),
        { name: 'InvoiceStore' }
    )
);
