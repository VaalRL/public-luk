"use client";

import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "./types";
import { useT } from "@/lib/i18n/context";

interface InvoiceRowProps {
    invoice: Invoice;
}

export const InvoiceRow = React.memo(function InvoiceRow({ invoice }: InvoiceRowProps) {
    const t = useT();
    // Memoize calculations
    const outstanding = React.useMemo(() => {
        return Math.round(invoice.totalAmount - invoice.paidAmount);
    }, [invoice.totalAmount, invoice.paidAmount]);

    const formattedDate = React.useMemo(() => {
        return new Date(invoice.date).toLocaleDateString("zh-TW");
    }, [invoice.date]);

    return (
        <TableRow>
            <TableCell className="font-medium">{invoice.company?.name || "-"}</TableCell>
            <TableCell className="font-mono">{invoice.invoiceNumber || "-"}</TableCell>
            <TableCell>
                {formattedDate}
            </TableCell>
            <TableCell className="text-right font-mono">
                ${invoice.totalAmount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right font-mono">
                ${invoice.paidAmount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right font-mono font-bold text-amber-600">
                ${outstanding.toLocaleString()}
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap gap-1">
                    {!invoice.company?.bankAccounts || invoice.company.bankAccounts.length === 0 ? (
                        <span className="text-sm text-muted-foreground">{t("reconciliation.ui.noAccount")}</span>
                    ) : (
                        invoice.company.bankAccounts.map((acc, idx) => (
                            <Badge
                                key={acc.last5Digits}
                                variant="secondary"
                                title={t("reconciliation.ui.receivingAccount", { n: idx + 1 })}
                            >
                                {acc.last5Digits}
                            </Badge>
                        ))
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
});
