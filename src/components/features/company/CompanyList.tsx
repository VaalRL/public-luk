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
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>公司名稱</TableHead>
                    <TableHead>簡稱</TableHead>
                    <TableHead>統編</TableHead>
                    <TableHead>聯絡人</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>電話</TableHead>
                    <TableHead>銀行帳號</TableHead>
                    <TableHead>帳單數</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {companies.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                            尚無公司資料
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
                                        <span className="text-muted-foreground text-sm">無</span>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onAddBankAccount(company.id)}
                                        className="h-6 text-xs"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        新增帳號
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
