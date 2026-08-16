import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Company Store
 * 管理公司和銀行帳號相關的全域狀態
 */

// Types
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

interface CompanyState {
    // State
    companies: Company[];
    currentCompany: Company | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setCompanies: (companies: Company[]) => void;
    setCurrentCompany: (company: Company | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;

    // CRUD Operations - Company
    addCompany: (company: Company) => void;
    updateCompany: (id: string, updates: Partial<Company>) => void;
    deleteCompany: (id: string) => void;

    // CRUD Operations - Bank Account
    addBankAccount: (companyId: string, account: BankAccount) => void;
    updateBankAccount: (
        companyId: string,
        accountId: string,
        updates: Partial<BankAccount>
    ) => void;
    deleteBankAccount: (companyId: string, accountId: string) => void;

    // Utility
    getCompanyById: (id: string) => Company | undefined;
    getCompanyByName: (name: string) => Company | undefined;
    getCompaniesByBankAccount: (last5Digits: string) => Company[];
    getBankAccountById: (companyId: string, accountId: string) => BankAccount | undefined;

    // Reset
    reset: () => void;
}

const initialState = {
    companies: [],
    currentCompany: null,
    isLoading: false,
    error: null,
};

export const useCompanyStore = create<CompanyState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Actions
            setCompanies: (companies) => set({ companies, error: null }),

            setCurrentCompany: (company) => set({ currentCompany: company }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error, isLoading: false }),

            // CRUD Operations - Company
            addCompany: (company) =>
                set((state) => ({
                    companies: [...state.companies, company],
                    error: null,
                })),

            updateCompany: (id, updates) =>
                set((state) => ({
                    companies: state.companies.map((comp) =>
                        comp.id === id ? { ...comp, ...updates } : comp
                    ),
                    currentCompany:
                        state.currentCompany?.id === id
                            ? { ...state.currentCompany, ...updates }
                            : state.currentCompany,
                    error: null,
                })),

            deleteCompany: (id) =>
                set((state) => ({
                    companies: state.companies.filter((comp) => comp.id !== id),
                    currentCompany:
                        state.currentCompany?.id === id ? null : state.currentCompany,
                    error: null,
                })),

            // CRUD Operations - Bank Account
            addBankAccount: (companyId, account) =>
                set((state) => ({
                    companies: state.companies.map((comp) =>
                        comp.id === companyId
                            ? { ...comp, bankAccounts: [...comp.bankAccounts, account] }
                            : comp
                    ),
                    currentCompany:
                        state.currentCompany?.id === companyId
                            ? {
                                ...state.currentCompany,
                                bankAccounts: [...state.currentCompany.bankAccounts, account],
                            }
                            : state.currentCompany,
                    error: null,
                })),

            updateBankAccount: (companyId, accountId, updates) =>
                set((state) => ({
                    companies: state.companies.map((comp) =>
                        comp.id === companyId
                            ? {
                                ...comp,
                                bankAccounts: comp.bankAccounts.map((acc) =>
                                    acc.id === accountId ? { ...acc, ...updates } : acc
                                ),
                            }
                            : comp
                    ),
                    currentCompany:
                        state.currentCompany?.id === companyId
                            ? {
                                ...state.currentCompany,
                                bankAccounts: state.currentCompany.bankAccounts.map((acc) =>
                                    acc.id === accountId ? { ...acc, ...updates } : acc
                                ),
                            }
                            : state.currentCompany,
                    error: null,
                })),

            deleteBankAccount: (companyId, accountId) =>
                set((state) => ({
                    companies: state.companies.map((comp) =>
                        comp.id === companyId
                            ? {
                                ...comp,
                                bankAccounts: comp.bankAccounts.filter(
                                    (acc) => acc.id !== accountId
                                ),
                            }
                            : comp
                    ),
                    currentCompany:
                        state.currentCompany?.id === companyId
                            ? {
                                ...state.currentCompany,
                                bankAccounts: state.currentCompany.bankAccounts.filter(
                                    (acc) => acc.id !== accountId
                                ),
                            }
                            : state.currentCompany,
                    error: null,
                })),

            // Utility
            getCompanyById: (id) => {
                return get().companies.find((comp) => comp.id === id);
            },

            getCompanyByName: (name) => {
                return get().companies.find(
                    (comp) => comp.name.toLowerCase() === name.toLowerCase()
                );
            },

            getCompaniesByBankAccount: (last5Digits) => {
                return get().companies.filter((comp) =>
                    comp.bankAccounts.some((acc) => acc.last5Digits === last5Digits)
                );
            },

            getBankAccountById: (companyId, accountId) => {
                const company = get().companies.find((comp) => comp.id === companyId);
                return company?.bankAccounts.find((acc) => acc.id === accountId);
            },

            // Reset
            reset: () => set(initialState),
        }),
        { name: 'CompanyStore' }
    )
);
