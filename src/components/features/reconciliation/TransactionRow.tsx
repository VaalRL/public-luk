"use client";

import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Transaction } from "./types";

interface TransactionRowProps {
    transaction: Transaction;
    isEditing: boolean;
    isSelected: boolean;
    editValues: Record<string, Partial<Transaction>>;
    onSelect: (id: string) => void;
    onInputChange: (id: string, field: keyof Transaction, value: Transaction[keyof Transaction]) => void;
    getStatus: (tx: Transaction) => React.ReactNode;
    getMatchedInvoices: (tx: Transaction) => React.ReactNode;
}

export const TransactionRow = React.memo(function TransactionRow({
    transaction,
    isEditing,
    isSelected,
    editValues,
    onSelect,
    onInputChange,
    getStatus,
    getMatchedInvoices,
}: TransactionRowProps) {
    // Memoize handlers
    const handleClick = React.useCallback(() => {
        if (!isEditing) {
            onSelect(transaction.id);
        }
    }, [isEditing, onSelect, transaction.id]);

    const handleNoteChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        // Extract only last 5 digits if more than 5 digits
        const digitsOnly = value.replace(/\D/g, "");
        if (digitsOnly.length > 5) {
            value = digitsOnly.slice(-5);
        }
        onInputChange(transaction.id, "note", value);
    }, [onInputChange, transaction.id]);

    // Memoize formatted date
    const formattedDate = React.useMemo(() => {
        return new Date(transaction.date).toLocaleDateString("zh-TW");
    }, [transaction.date]);

    // Memoize displayed note
    const displayedNote = React.useMemo(() => {
        if (!transaction.note) return null;
        const digitsOnly = transaction.note.replace(/\D/g, "");
        return digitsOnly.length > 5 ? digitsOnly.slice(-5) : transaction.note;
    }, [transaction.note]);

    return (
        <TableRow
            className={isSelected ? "bg-muted/50" : ""}
            onClick={handleClick}
        >
            <TableCell>
                {formattedDate}
            </TableCell>
            <TableCell>
                {isEditing ? (
                    <div className="flex flex-col gap-2 min-w-[150px]">
                        <div className="text-sm text-muted-foreground">
                            摘要: {transaction.description || "-"}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm whitespace-nowrap">後五碼:</span>
                            <Input
                                placeholder="00000"
                                value={
                                    editValues[transaction.id]?.note ??
                                    (transaction.note
                                        ? transaction.note.replace(/\D/g, "").slice(-5)
                                        : "")
                                }
                                onChange={handleNoteChange}
                                maxLength={5}
                                className="w-[100px] font-mono text-center"
                            />
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="font-medium">{transaction.description || "-"}</p>
                        {displayedNote && (
                            <p className="text-sm text-muted-foreground font-mono">
                                {displayedNote}
                            </p>
                        )}
                    </div>
                )}
            </TableCell>
            <TableCell className="text-right">
                <span className="font-mono font-bold">
                    ${transaction.deposit.toLocaleString()}
                </span>
            </TableCell>
            <TableCell>{getStatus(transaction)}</TableCell>
            <TableCell>
                {getMatchedInvoices(transaction) || (
                    <span className="text-sm text-muted-foreground">-</span>
                )}
            </TableCell>
        </TableRow>
    );
});
