"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Trash2, Edit } from "lucide-react";
import { deleteInvoice } from "@/app/actions/invoice";
import { format } from "date-fns";
import { InvoiceDownloadButton } from "@/components/invoice-download-button";
import { InvoiceReminderManager } from "@/components/invoice-reminder-manager";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

type Invoice = {
    id: string;
    invoiceNumber: string | null;
    title: string;
    date: Date;
    amount: number;
    taxAmount: number;
    totalAmount: number;
    status: string;
    paidAmount: number;
    items: string; // JSON string
    companyId: string;
    providerId?: string | null;
    issueInvoice?: boolean;
    reminders?: { id: string; date: Date }[];
    company: {
        id: string;
        name: string;
        taxId?: string | null;
        contactName?: string | null;
        phone?: string | null;
        address?: string | null;
        bankAccounts?: {
            id: string;
            accountNumber: string;
            branch?: string | null;
            accountHolder?: string | null;
            currency: string;
            note?: string | null;
            last5Digits: string;
        }[];
    };
    provider?: {
        id: string;
        name: string;
        taxId?: string | null;
        contactName?: string | null;
        phone?: string | null;
        address?: string | null;
        email?: string | null;
    } | null;
};

interface InvoiceListProps {
    invoices: Invoice[];
    onEdit?: (invoice: Invoice) => void;
    onView?: (invoice: Invoice) => void;
}

export function InvoiceList({ invoices, onEdit, onView }: InvoiceListProps) {
    const { toast } = useToast();
    const [invoiceFilter, setInvoiceFilter] = useState<string>("all");
    const [monthFilter, setMonthFilter] = useState<string>("all");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteClick = (id: string) => {
        setInvoiceToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;

        setIsDeleting(true);
        const result = await deleteInvoice(invoiceToDelete);

        if (result.success) {
            setDeleteDialogOpen(false);
            setInvoiceToDelete(null);
            toast({
                title: "刪除成功",
                description: "帳單已成功刪除",
            });
            window.location.reload();
        } else {
            toast({
                title: "刪除失敗",
                description: result.error,
                variant: "destructive",
            });
        }

        setIsDeleting(false);
    };

    const getStatusBadge = (status: string, paidAmount: number, totalAmount: number) => {
        if (status === "paid" || paidAmount >= totalAmount) {
            return <Badge variant="default" className="bg-green-600">已付清</Badge>;
        } else if (paidAmount > 0) {
            return <Badge variant="secondary">部分付款</Badge>;
        } else {
            return <Badge variant="outline">未付款</Badge>;
        }
    };

    // Extract unique months from invoices (sorted descending)
    const availableMonths = React.useMemo(() => {
        const months = new Set<string>();
        invoices.forEach((invoice) => {
            const month = format(new Date(invoice.date), "yyyy-MM");
            months.add(month);
        });
        return Array.from(months).sort().reverse();
    }, [invoices]);

    // Filter invoices based on tax amount and month
    const filteredInvoices = invoices.filter((invoice) => {
        // Filter by invoice type
        if (invoiceFilter !== "all") {
            if (invoiceFilter === "need-invoice" && invoice.taxAmount === 0) return false;
            if (invoiceFilter === "no-invoice" && invoice.taxAmount > 0) return false;
        }

        // Filter by month
        if (monthFilter !== "all") {
            const invoiceMonth = format(new Date(invoice.date), "yyyy-MM");
            if (invoiceMonth !== monthFilter) return false;
        }

        return true;
    });

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        帳單列表
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">篩選：</span>
                        <Select value={monthFilter} onValueChange={setMonthFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="選擇月份" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部月份</SelectItem>
                                {availableMonths.map((month) => (
                                    <SelectItem key={month} value={month}>
                                        {format(new Date(month + "-01"), "yyyy 年 MM 月")}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部類型</SelectItem>
                                <SelectItem value="need-invoice">需開發票</SelectItem>
                                <SelectItem value="no-invoice">不需發票</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>帳單號碼</TableHead>
                            <TableHead>客戶</TableHead>
                            <TableHead>日期</TableHead>
                            <TableHead className="text-right">金額</TableHead>
                            <TableHead className="text-right">稅額</TableHead>
                            <TableHead className="text-right">總計</TableHead>
                            <TableHead className="text-right">已付</TableHead>
                            <TableHead>發票需求</TableHead>
                            <TableHead>提醒</TableHead>
                            <TableHead>狀態</TableHead>
                            <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <AnimatePresence mode="popLayout">
                            {filteredInvoices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                                        {invoiceFilter === "all" ? "尚無帳單資料" : "無符合條件的帳單"}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredInvoices.map((invoice, index) => (
                                    <motion.tr
                                        key={invoice.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{
                                            duration: 0.3,
                                            delay: index * 0.05,
                                            ease: "easeOut"
                                        }}
                                        className="cursor-pointer hover:bg-muted/50 border-b transition-colors"
                                        onClick={() => onView?.(invoice)}
                                    >
                                        <TableCell className="font-mono">
                                            {invoice.invoiceNumber || "-"}
                                        </TableCell>
                                        <TableCell className="font-medium">{invoice.company.name}</TableCell>
                                        <TableCell suppressHydrationWarning>{format(new Date(invoice.date), "yyyy/MM/dd")}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            ${invoice.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            ${invoice.taxAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            ${invoice.totalAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            ${invoice.paidAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {invoice.taxAmount > 0 ? (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                                                    需開立
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-gray-500 dark:text-gray-400">
                                                    不需發票
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <InvoiceReminderManager
                                                invoiceId={invoice.id}
                                                reminders={invoice.reminders || []}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {getStatusBadge(invoice.status, invoice.paidAmount, invoice.totalAmount)}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2">
                                                {onEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => onEdit(invoice)}
                                                        title="編輯"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                )}

                                                <InvoiceDownloadButton
                                                    invoice={invoice}
                                                    fileName={`invoice-${invoice.invoiceNumber || 'draft'}.pdf`}
                                                />

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteClick(invoice.id)}
                                                    title="刪除"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </motion.tr>
                                ))
                            )}
                        </AnimatePresence>
                    </TableBody>
                </Table>
            </CardContent>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>確認刪除</AlertDialogTitle>
                        <AlertDialogDescription>
                            確定要刪除此帳單嗎？此操作無法復原，相關的銷帳記錄和提醒也會一併刪除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "刪除中..." : "確定刪除"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
