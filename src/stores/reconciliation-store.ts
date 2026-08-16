import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Reconciliation Store
 * 管理對帳相關的全域狀態
 */

// Types
export interface Transaction {
    id: string;
    date: Date;
    description: string | null;
    deposit: number;
    withdrawal: number;
    balance?: number | null;
    note: string | null;
    status: string;
    /** 手動記錄的付款與資料修復分錄沒有對應的銀行對帳單，故可為 null */
    bankStatementId: string | null;
    reconciliations: ReconciliationRecord[];
    anomalyFlags?: string | null;
    anomalyScore?: number | null;
}

export interface ReconciliationRecord {
    id: string;
    invoiceId: string;
    transactionId: string | null;
    overpaymentId?: string | null;
    amount: number;
    createdAt: Date;
    invoice?: {
        id: string;
        invoiceNumber: string | null;
        company: {
            name: string;
        };
    };
}

export interface BankStatement {
    id: string;
    filename: string;
    totalAmount?: number | null;
    uploadedAt: Date;
    transactions: Transaction[];
}

interface ReconciliationState {
    // State
    transactions: Transaction[];
    bankStatements: BankStatement[];
    currentTransaction: Transaction | null;
    selectedTransactions: Set<string>;
    isLoading: boolean;
    error: string | null;

    // Actions
    setTransactions: (transactions: Transaction[]) => void;
    setBankStatements: (statements: BankStatement[]) => void;
    setCurrentTransaction: (transaction: Transaction | null) => void;
    setLoading: (isLoading: boolean) => void;
    setError: (error: string | null) => void;

    // Selection
    toggleTransactionSelection: (id: string) => void;
    selectAllTransactions: () => void;
    clearSelection: () => void;
    getSelectedTransactions: () => Transaction[];

    // CRUD Operations - Transaction
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;

    // CRUD Operations - Bank Statement
    addBankStatement: (statement: BankStatement) => void;
    deleteBankStatement: (id: string) => void;

    // CRUD Operations - Reconciliation
    addReconciliation: (transactionId: string, record: ReconciliationRecord) => void;
    deleteReconciliation: (transactionId: string, recordId: string) => void;

    // Utility
    getTransactionById: (id: string) => Transaction | undefined;
    getUnmatchedTransactions: () => Transaction[];
    getMatchedTransactions: () => Transaction[];
    getAmbiguousTransactions: () => Transaction[];
    getTransactionsByStatus: (status: string) => Transaction[];
    getBankStatementById: (id: string) => BankStatement | undefined;

    // Reset
    reset: () => void;
}

const initialState = {
    transactions: [],
    bankStatements: [],
    currentTransaction: null,
    selectedTransactions: new Set<string>(),
    isLoading: false,
    error: null,
};

export const useReconciliationStore = create<ReconciliationState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            // Actions
            setTransactions: (transactions) => set({ transactions, error: null }),

            setBankStatements: (statements) => set({ bankStatements: statements, error: null }),

            setCurrentTransaction: (transaction) => set({ currentTransaction: transaction }),

            setLoading: (isLoading) => set({ isLoading }),

            setError: (error) => set({ error, isLoading: false }),

            // Selection
            toggleTransactionSelection: (id) =>
                set((state) => {
                    const newSelection = new Set(state.selectedTransactions);
                    if (newSelection.has(id)) {
                        newSelection.delete(id);
                    } else {
                        newSelection.add(id);
                    }
                    return { selectedTransactions: newSelection };
                }),

            selectAllTransactions: () =>
                set((state) => ({
                    selectedTransactions: new Set(state.transactions.map((t) => t.id)),
                })),

            clearSelection: () => set({ selectedTransactions: new Set() }),

            getSelectedTransactions: () => {
                const state = get();
                return state.transactions.filter((t) =>
                    state.selectedTransactions.has(t.id)
                );
            },

            // CRUD Operations - Transaction
            addTransaction: (transaction) =>
                set((state) => ({
                    transactions: [...state.transactions, transaction],
                    error: null,
                })),

            updateTransaction: (id, updates) =>
                set((state) => ({
                    transactions: state.transactions.map((tx) =>
                        tx.id === id ? { ...tx, ...updates } : tx
                    ),
                    currentTransaction:
                        state.currentTransaction?.id === id
                            ? { ...state.currentTransaction, ...updates }
                            : state.currentTransaction,
                    error: null,
                })),

            deleteTransaction: (id) =>
                set((state) => ({
                    transactions: state.transactions.filter((tx) => tx.id !== id),
                    currentTransaction:
                        state.currentTransaction?.id === id ? null : state.currentTransaction,
                    selectedTransactions: new Set(
                        Array.from(state.selectedTransactions).filter((txId) => txId !== id)
                    ),
                    error: null,
                })),

            // CRUD Operations - Bank Statement
            addBankStatement: (statement) =>
                set((state) => ({
                    bankStatements: [...state.bankStatements, statement],
                    transactions: [...state.transactions, ...statement.transactions],
                    error: null,
                })),

            deleteBankStatement: (id) =>
                set((state) => {
                    const statement = state.bankStatements.find((s) => s.id === id);
                    const transactionIds = new Set(
                        statement?.transactions.map((t) => t.id) || []
                    );
                    return {
                        bankStatements: state.bankStatements.filter((s) => s.id !== id),
                        transactions: state.transactions.filter(
                            (t) => !transactionIds.has(t.id)
                        ),
                        error: null,
                    };
                }),

            // CRUD Operations - Reconciliation
            addReconciliation: (transactionId, record) =>
                set((state) => ({
                    transactions: state.transactions.map((tx) =>
                        tx.id === transactionId
                            ? {
                                ...tx,
                                reconciliations: [...tx.reconciliations, record],
                                status: 'matched',
                            }
                            : tx
                    ),
                    error: null,
                })),

            deleteReconciliation: (transactionId, recordId) =>
                set((state) => ({
                    transactions: state.transactions.map((tx) =>
                        tx.id === transactionId
                            ? {
                                ...tx,
                                reconciliations: tx.reconciliations.filter(
                                    (rec) => rec.id !== recordId
                                ),
                                status:
                                    tx.reconciliations.length === 1 ? 'unmatched' : tx.status,
                            }
                            : tx
                    ),
                    error: null,
                })),

            // Utility
            getTransactionById: (id) => {
                return get().transactions.find((tx) => tx.id === id);
            },

            getUnmatchedTransactions: () => {
                return get().transactions.filter((tx) => tx.status === 'unmatched');
            },

            getMatchedTransactions: () => {
                return get().transactions.filter((tx) => tx.status === 'matched');
            },

            getAmbiguousTransactions: () => {
                return get().transactions.filter((tx) => tx.status === 'ambiguous');
            },

            getTransactionsByStatus: (status) => {
                return get().transactions.filter((tx) => tx.status === status);
            },

            getBankStatementById: (id) => {
                return get().bankStatements.find((s) => s.id === id);
            },

            // Reset
            reset: () => set(initialState),
        }),
        { name: 'ReconciliationStore' }
    )
);
