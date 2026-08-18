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
import { useT } from "@/lib/i18n/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Company } from "./types";

interface CompanyListProps {
    companies: Company[];
    onEdit: (company: Company) => void;
    onDelete: (id: string) => void;
    onAddBankAccount: (companyId: string) => void;
}

export function CompanyList({
    companies,
    onEdit,
    onDelete,
    onAddBankAccount,
}: CompanyListProps) {
    const t = useT();
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("companyList.name")}</TableHead>
                    <TableHead>{t("companyList.shortName")}</TableHead>
                    <TableHead>{t("companyList.taxId")}</TableHead>
                    <TableHead>{t("companyList.contact")}</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>{t("companyList.phone")}</TableHead>
                    <TableHead>{t("companyList.bankAccounts")}</TableHead>
                    <TableHead>{t("companyList.invoiceCount")}</TableHead>
                    <TableHead className="text-right">{t("companyList.actions")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {companies.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                            {t("companyList.empty")}
                        </TableCell>
                    </TableRow>
                ) : (
                    companies.map((company) => (
                        <TableRow key={company.id}>
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>{company.shortName || "-"}</TableCell>
                            <TableCell>{company.taxId || "-"}</TableCell>
                            <TableCell>{company.contactName || "-"}</TableCell>
                            <TableCell>{company.email || "-"}</TableCell>
                            <TableCell>{company.phone || "-"}</TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    {company.bankAccounts.length > 0 ? (
                                        company.bankAccounts.map((account) => (
                                            <Badge key={account.id} variant="outline" className="text-xs">
                                                {account.accountNumber} ({account.currency})
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-muted-foreground text-sm">{t("companyList.none")}</span>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onAddBankAccount(company.id)}
                                        className="h-6 text-xs"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        {t("companyList.addAccount")}
                                    </Button>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{company._count?.clientInvoices || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEdit(company)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(company.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );
}
