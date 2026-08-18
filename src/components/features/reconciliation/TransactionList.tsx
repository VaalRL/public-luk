"use client";

import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TransactionRow } from "./TransactionRow";
import { useT } from "@/lib/i18n/context";
import { Transaction } from "./types";

interface TransactionListProps {
    transactions: Transaction[];
    selectedTxId: string | null;
    isEditing: boolean;
    editValues: Record<string, Partial<Transaction>>;
    onSelect: (id: string) => void;
    onInputChange: (id: string, field: keyof Transaction, value: Transaction[keyof Transaction]) => void;
    getStatus: (tx: Transaction) => React.ReactNode;
    getMatchedInvoices: (tx: Transaction) => React.ReactNode;
}

export const TransactionList = React.memo(function TransactionList({
    transactions,
    selectedTxId,
    isEditing,
    editValues,
    onSelect,
    onInputChange,
    getStatus,
    getMatchedInvoices,
}: TransactionListProps) {
    const t = useT();
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("reconciliation.ui.date")}</TableHead>
                    <TableHead>{t("reconciliation.ui.summary")}</TableHead>
                    <TableHead className="text-right">{t("reconciliation.ui.amount")}</TableHead>
                    <TableHead>{t("reconciliation.ui.state")}</TableHead>
                    <TableHead>{t("reconciliation.ui.result")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {transactions.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                        >
                            {t("reconciliation.ui.noTransactions")}
                        </TableCell>
                    </TableRow>
                ) : (
                    transactions.map((tx) => (
                        <TransactionRow
                            key={tx.id}
                            transaction={tx}
                            isEditing={isEditing}
                            isSelected={selectedTxId === tx.id}
                            editValues={editValues}
                            onSelect={onSelect}
                            onInputChange={onInputChange}
                            getStatus={getStatus}
                            getMatchedInvoices={getMatchedInvoices}
                        />
                    ))
                )}
            </TableBody>
        </Table>
    );
});
