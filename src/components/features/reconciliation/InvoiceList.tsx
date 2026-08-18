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
import { InvoiceRow } from "./InvoiceRow";
import { Invoice } from "./types";
import { useT } from "@/lib/i18n/context";

interface InvoiceListProps {
    invoices: Invoice[];
}

export const InvoiceList = React.memo(function InvoiceList({ invoices }: InvoiceListProps) {
    const t = useT();
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("reconciliation.ui.company")}</TableHead>
                    <TableHead>{t("reconciliation.ui.invoiceNumber")}</TableHead>
                    <TableHead>{t("reconciliation.ui.date")}</TableHead>
                    <TableHead className="text-right">{t("reconciliation.ui.total")}</TableHead>
                    <TableHead className="text-right">{t("reconciliation.ui.paid")}</TableHead>
                    <TableHead className="text-right">{t("reconciliation.ui.unpaid")}</TableHead>
                    <TableHead>{t("reconciliation.ui.last5Short")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground"
                        >
                            {t("reconciliation.ui.allSettled")}
                        </TableCell>
                    </TableRow>
                ) : (
                    invoices.map((invoice) => (
                        <InvoiceRow key={invoice.id} invoice={invoice} />
                    ))
                )}
            </TableBody>
        </Table>
    );
});
