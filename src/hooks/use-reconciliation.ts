import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { autoMatchTransactions, deleteBankStatement, updateTransaction } from "@/app/actions/reconciliation";
import { saveReconciliationSnapshot } from "@/app/actions/snapshot";
import { Transaction, Invoice } from "@/components/features/reconciliation/types";
import { useUIStore, useReconciliationStore, useInvoiceStore } from "@/stores";

interface UseReconciliationProps {
    initialTransactions: Transaction[];
    initialInvoices: Invoice[];
}

export function useReconciliation({
    initialTransactions,
    initialInvoices,
}: UseReconciliationProps) {
    const router = useRouter();

    // Local UI state
    const [isMatching, setIsMatching] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState<Record<string, Partial<Transaction>>>({});
    const [snapshotMonth, setSnapshotMonth] = useState(
        new Date().toISOString().slice(0, 7)
    );
    const [markedInvoiceIds, setMarkedInvoiceIds] = useState<Set<string>>(
        new Set()
    );

    // Global Store state
    const {
        transactions,
        setTransactions,
        currentTransaction,
        setCurrentTransaction,
        updateTransaction: updateStoreTransaction
    } = useReconciliationStore();

    const {
        invoices,
        setInvoices
    } = useInvoiceStore();

    // Sync props to store
    useEffect(() => {
        setTransactions(initialTransactions);
    }, [initialTransactions, setTransactions]);

    useEffect(() => {
        setInvoices(initialInvoices);
    }, [initialInvoices, setInvoices]);

    // Derived state for UI compatibility
    const selectedTx = currentTransaction?.id || null;

    // Use UI store for dialog and collapsible states
    const {
        activeDialog,
        dialogData,
        openDialog,
        closeDialog,
        collapsedSections,
        toggleSection,
        addNotification,
    } = useUIStore();

    // Collapsible states using UI store
    const isTransactionsOpen = !collapsedSections['reconciliation-transactions'];
    const isInvoicesOpen = !collapsedSections['reconciliation-invoices'];

    const setIsTransactionsOpen = (_isOpen: boolean) =>
        toggleSection('reconciliation-transactions');
    const setIsInvoicesOpen = (_isOpen: boolean) =>
        toggleSection('reconciliation-invoices');

    const toggleInvoiceMark = (id: string) => {
        const newSet = new Set(markedInvoiceIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setMarkedInvoiceIds(newSet);
    };

    const setSelectedTx = (id: string | null) => {
        if (id === null) {
            setCurrentTransaction(null);
        } else {
            const tx = transactions.find(t => t.id === id);
            setCurrentTransaction(tx || null);
        }
    };

    const handleAutoMatch = async () => {
        setIsMatching(true);
        try {
            const result = await autoMatchTransactions({
                transactionIds: transactions.map((t) => t.id)
            });
            if (result.success && result.data) {
                // Refresh data from server
                router.refresh();

                addNotification({
                    type: 'success',
                    title: "自動銷帳完成",
                    message: `成功匹配 ${result.data.results?.reduce((acc, r) => acc + r.matchesCount, 0) || 0} 筆交易`,
                });
            } else {
                addNotification({
                    type: 'error',
                    title: "自動銷帳失敗",
                    message: !result.success && 'error' in result ? result.error : "發生未知錯誤",
                });
            }
        } catch (error) {
            console.error("Auto match error:", error);
            addNotification({
                type: 'error',
                title: "錯誤",
                message: "執行自動銷帳時發生錯誤",
            });
        } finally {
            setIsMatching(false);
        }
    };

    const handleClear = () => {
        openDialog('delete-confirm');
    };

    const handleConfirmDelete = async () => {
        try {
            if (transactions.length === 0) return;
            // 手動記帳／資料修復的分錄沒有對帳單，取第一筆真的來自對帳單的交易
            const bankStatementId = transactions.find(t => t.bankStatementId)?.bankStatementId;
            if (!bankStatementId) {
                addNotification({
                    type: 'error',
                    title: "移除失敗",
                    message: "目前沒有可移除的銀行明細",
                });
                return;
            }
            const result = await deleteBankStatement(bankStatementId);

            if (result.success) {
                setTransactions([]);
                closeDialog();
                router.refresh();
            } else {
                addNotification({
                    type: 'error',
                    title: "移除失敗",
                    message: result.error || "無法移除銀行明細",
                });
            }
        } catch (error) {
            console.error("Delete error:", error);
            addNotification({
                type: 'error',
                title: "錯誤",
                message: "移除銀行明細時發生錯誤",
            });
        } finally {
            closeDialog();
        }
    };

    const handleEditToggle = () => {
        if (isEditing) {
            setEditValues({});
            setIsEditing(false);
        } else {
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        try {
            const updates = Object.entries(editValues).map(([id, changes]) =>
                updateTransaction(id, changes)
            );

            await Promise.all(updates);

            // Optimistically update store
            Object.entries(editValues).forEach(([id, changes]) => {
                updateStoreTransaction(id, changes);
            });

            router.refresh();
        } catch (error) {
            console.error("Save error:", error);
            addNotification({
                type: 'error',
                title: "儲存失敗",
                message: "儲存變更時發生錯誤",
            });
        } finally {
            setIsEditing(false);
            setEditValues({});
        }
    };

    const handleOpenSnapshotDialog = () => {
        openDialog('snapshot', { month: snapshotMonth });
    };

    const handleConfirmSaveSnapshot = async () => {
        try {
            await saveReconciliationSnapshot(snapshotMonth);
            addNotification({
                type: 'success',
                title: "儲存成功",
                message: `已儲存 ${snapshotMonth} 的對帳記錄`,
            });
        } catch (error) {
            console.error("Save snapshot error:", error);
            addNotification({
                type: 'error',
                title: "儲存失敗",
                message: "無法儲存對帳記錄",
            });
        } finally {
            closeDialog();
        }
    };

    const handleInputChange = (
        id: string,
        field: keyof Transaction,
        value: Transaction[keyof Transaction]
    ) => {
        setEditValues((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    return {
        state: {
            transactions,
            invoices,
            isMatching,
            isEditing,
            editValues,
            selectedTx,
            snapshotMonth,
            markedInvoiceIds,
            isTransactionsOpen,
            isInvoicesOpen,
            // Dialog states from UI store
            activeDialog,
            dialogData,
        },
        actions: {
            setTransactions,
            setInvoices,
            setIsMatching,
            setIsEditing,
            setEditValues,
            setSelectedTx,
            setSnapshotMonth,
            setMarkedInvoiceIds,
            setIsTransactionsOpen,
            setIsInvoicesOpen,
            toggleInvoiceMark,
            handleAutoMatch,
            handleClear,
            handleConfirmDelete,
            handleEditToggle,
            handleSave,
            handleOpenSnapshotDialog,
            handleConfirmSaveSnapshot,
            handleInputChange,
            // Dialog actions from UI store
            openDialog,
            closeDialog,
        },
    };
}
