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

interface InvoiceListProps {
    invoices: Invoice[];
}

export const InvoiceList = React.memo(function InvoiceList({ invoices }: InvoiceListProps) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>公司</TableHead>
                    <TableHead>帳單號碼</TableHead>
                    <TableHead>日期</TableHead>
                    <TableHead className="text-right">總額</TableHead>
                    <TableHead className="text-right">已付</TableHead>
                    <TableHead className="text-right">未付</TableHead>
                    <TableHead>後五碼</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {invoices.length === 0 ? (
                    <TableRow>
                        <TableCell
                            colSpan={7}
                            className="text-center text-muted-foreground"
                        >
                            所有帳單已結清
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
