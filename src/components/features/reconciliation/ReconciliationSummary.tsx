"use client";

import React, {} from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CheckCircle2, AlertCircle, BellPlus, Calendar as _CalendarIcon } from "lucide-react";
import { Invoice, Overpayment, NotificationTemplate } from "./types";
import { generateNotificationMessage } from "@/lib/notification-utils";
import { NotificationMessage } from "@/components/notification-message";
import { addInvoiceReminder } from "@/app/actions/invoice";
import { useToast } from "@/hooks/use-toast";
import {} from "@/lib/utils";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

interface SummaryTableProps {
    title: string;
    data: Invoice[];
    type: "paid" | "partial" | "unpaid";
    notificationTemplates: NotificationTemplate[];
    markedInvoiceIds: Set<string>;
    toggleInvoiceMark: (id: string) => void;
}

function SummaryTable({
    title,
    data,
    type,
    notificationTemplates,
    markedInvoiceIds,
    toggleInvoiceMark,
}: SummaryTableProps) {
    const { toast } = useToast();

    // Get appropriate template
    const templateType =
        type === "paid" ? "payment_confirmed" : "payment_reminder";
    const template = notificationTemplates.find((t) => t.type === templateType);

    const handleAddReminder = async (invoiceId: string, date: Date | undefined) => {
        if (!date) return;
        try {
            await addInvoiceReminder(invoiceId, date);
            toast({
                title: "已新增待辦提醒",
                description: format(date, "yyyy/MM/dd", { locale: zhTW }),
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "新增提醒失敗",
                description: "請稍後再試",
            });
        }
    };

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {type === "paid" && (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {type === "partial" && (
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                    )}
                    {type === "unpaid" && (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    {title} ({data.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>公司</TableHead>
                            <TableHead>帳單號碼</TableHead>
                            <TableHead>日期</TableHead>
                            <TableHead className="text-right">總額</TableHead>
                            <TableHead className="text-right">未付</TableHead>
                            <TableHead className="w-[250px]">通知文案</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={8}
                                    className="text-center text-muted-foreground"
                                >
                                    無資料
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((invoice) => {
                                const unpaidAmount = Math.round(
                                    invoice.totalAmount - invoice.paidAmount
                                );
                                const isMarked = markedInvoiceIds.has(invoice.id);

                                // Requirement 2: Ensure "Paid" messages use same logic/vars as "Unpaid" if desired,
                                // but typically "Paid" messages use totalAmount.
                                // If the user wants the EXACT same copy logic (e.g. showing unpaid amount even if 0),
                                // we can adjust here. But usually "Paid" implies 0 unpaid.
                                // The user said: "銷帳統整處已銷帳後方的文案複製規格應與未銷帳相同"
                                // This likely means they want the ability to copy the text, which is handled by NotificationMessage.
                                // Or they want the text content to be generated similarly.
                                // Let's assume standard behavior for now but ensure NotificationMessage is used.

                                const message = template
                                    ? generateNotificationMessage(template.template, {
                                        amount: type === "paid" ? invoice.totalAmount : unpaidAmount,
                                        invoiceNumber:
                                            invoice.invoiceNumber || invoice.id.slice(0, 8),
                                        companyName: invoice.company?.name || "未知公司",
                                        date: invoice.date,
                                    })
                                    : "";

                                return (
                                    <TableRow
                                        key={invoice.id}
                                        className={
                                            isMarked
                                                ? "bg-muted/50 text-muted-foreground opacity-50 line-through"
                                                : ""
                                        }
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isMarked}
                                                onCheckedChange={() => toggleInvoiceMark(invoice.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {invoice.company?.name || "-"}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {invoice.invoiceNumber || "-"}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(invoice.date).toLocaleDateString("zh-TW")}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            ${invoice.totalAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-amber-600">
                                            ${unpaidAmount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            {message ? (
                                                <NotificationMessage
                                                    message={message}
                                                    variant="default"
                                                />
                                            ) : (
                                                <div className="text-xs text-muted-foreground">
                                                    請至設定頁面設定通知文案
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <BellPlus className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="end">
                                                    <Calendar
                                                        mode="single"
                                                        selected={new Date()}
                                                        onSelect={(date) => handleAddReminder(invoice.id, date)}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

interface ReconciliationSummaryProps {
    paidInvoices: Invoice[];
    reviewInvoices: Invoice[];
    openInvoices: Invoice[];
    overpayments: Overpayment[];
    notificationTemplates: NotificationTemplate[];
    markedInvoiceIds: Set<string>;
    toggleInvoiceMark: (id: string) => void;
}

export function ReconciliationSummary({
    paidInvoices,
    openInvoices,
    overpayments,
    notificationTemplates,
    markedInvoiceIds,
    toggleInvoiceMark,
}: ReconciliationSummaryProps) {
    return (
        <div className="space-y-6">
            <SummaryTable
                title="已銷帳"
                data={paidInvoices}
                type="paid"
                notificationTemplates={notificationTemplates}
                markedInvoiceIds={markedInvoiceIds}
                toggleInvoiceMark={toggleInvoiceMark}
            />
            {/* Requirement 1: Partial payments are now in "openInvoices", so "reviewInvoices" section is removed or merged */}
            {/* If reviewInvoices still contains data (e.g. from other logic), we can show it, but per request it should be treated as unpaid */}
            {/* Since we modified the parent component to empty reviewInvoices, this section will just be empty if we keep it. */}
            {/* Let's remove it to be clean. */}

            <SummaryTable
                title="未銷帳"
                data={openInvoices}
                type="unpaid"
                notificationTemplates={notificationTemplates}
                markedInvoiceIds={markedInvoiceIds}
                toggleInvoiceMark={toggleInvoiceMark}
            />


            {/* Overpayments Section - Always visible */}
            <Card className="border-2 border-blue-500/50 bg-blue-500/10 dark:border-blue-400/50 dark:bg-blue-400/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                        <CheckCircle2 className="w-5 h-5" />
                        溢繳款項 ({overpayments.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {overpayments.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            目前無溢繳款項
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>公司</TableHead>
                                    <TableHead>虛擬帳號後五碼</TableHead>
                                    <TableHead className="text-right">溢繳金額</TableHead>
                                    <TableHead>說明</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {overpayments.map((overpayment) => (
                                    <TableRow key={overpayment.id}>
                                        <TableCell className="font-medium">
                                            {overpayment.company.name}
                                        </TableCell>
                                        <TableCell className="font-mono">
                                            {overpayment.last5Digits}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">
                                            ${overpayment.amount.toLocaleString()}
                                        </TableCell>
                                        <TableCell>{overpayment.description || "-"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
