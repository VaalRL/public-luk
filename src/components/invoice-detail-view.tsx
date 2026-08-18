"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Edit, FileText, Calendar, DollarSign, Building2, User } from "lucide-react";
import { format } from "date-fns";
import { InvoiceDownloadButton } from "@/components/invoice-download-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordManualPayment } from "@/app/actions/invoice";
import { useToast } from "@/hooks/use-toast";
import { derivedTaxRate } from "@/lib/invoice-total";
import { useT } from "@/lib/i18n/context";
import type { InvoiceItem } from "@/lib/validations/invoice";

type Company = {
    id: string;
    name: string;
    taxId?: string | null;
    contactName?: string | null;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    bankAccounts?: {
        id: string;
        accountNumber: string;
        branch?: string | null;
        accountHolder?: string | null;
        currency: string;
        note?: string | null;
    }[];
};

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
    items: string;
    companyId: string;
    providerId?: string | null;
    templateId?: string;
    issueInvoice?: boolean;
    company: Company;
    provider?: Company | null;
    reminders?: { id: string; date: Date; text?: string | null }[];
};

interface InvoiceDetailViewProps {
    invoice: Invoice;
    onEdit: () => void;
    onBack: () => void;
}

export function InvoiceDetailView({ invoice, onEdit, onBack }: InvoiceDetailViewProps) {
    const { toast } = useToast();
    const t = useT();
    const items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;

    const getStatusBadge = (status: string, paidAmount: number, totalAmount: number) => {
        if (status === "paid" || paidAmount >= totalAmount) {
            return <Badge className="bg-green-600">{t("invoicing.status.paid")}</Badge>;
        } else if (paidAmount > 0) {
            return <Badge variant="secondary">{t("invoicing.status.partial")}</Badge>;
        } else {
            return <Badge variant="outline">{t("invoicing.status.unpaid")}</Badge>;
        }
    };

    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(Math.round(invoice.totalAmount - invoice.paidAmount));
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentNote, setPaymentNote] = useState("");
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    const handleRecordPayment = async () => {
        setIsSubmittingPayment(true);
        try {
            const result = await recordManualPayment({
                invoiceId: invoice.id,
                amount: paymentAmount,
                date: new Date(paymentDate),
                note: paymentNote || t("invoicing.detail.manualPayment")
            });

            if (result.success) {
                setIsPaymentDialogOpen(false);
                toast({
                    title: t("common.saveSuccess"),
                    description: t("invoicing.detail.paymentRecorded"),
                });
                // Refresh logic would go here
            } else {
                toast({
                    title: t("common.saveFailed"),
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: t("common.saveFailed"),
                description: t("invoicing.detail.paymentFailed"),
                variant: "destructive",
            });
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                {t("invoicing.detail.cardTitle")}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                {invoice.invoiceNumber || t("invoicing.detail.noInvoiceNumber")}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    {t("invoicing.detail.recordPayment")}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t("invoicing.detail.manualPayment")}</DialogTitle>
                                    <DialogDescription>
                                        {t("invoicing.detail.recordPaymentHint1")}
                                        {t("invoicing.detail.recordPaymentHint2")}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="amount" className="text-right">
                                            {t("invoicing.detail.amount")}
                                        </Label>
                                        <Input
                                            id="amount"
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(Math.round(parseFloat(e.target.value) || 0))}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="date" className="text-right">
                                            {t("invoicing.detail.date")}
                                        </Label>
                                        <Input
                                            id="date"
                                            type="date"
                                            value={paymentDate}
                                            onChange={(e) => setPaymentDate(e.target.value)}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="note" className="text-right">
                                            {t("invoicing.detail.note")}
                                        </Label>
                                        <Input
                                            id="note"
                                            value={paymentNote}
                                            onChange={(e) => setPaymentNote(e.target.value)}
                                            placeholder={t("invoicing.detail.notePlaceholder")}
                                            className="col-span-3"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleRecordPayment} disabled={isSubmittingPayment}>
                                        {isSubmittingPayment ? t("invoicing.detail.recording") : t("invoicing.detail.confirmRecord")}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <InvoiceDownloadButton invoice={invoice} />
                        <Button onClick={onEdit}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t("common.edit")}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Status and Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t("invoicing.detail.state")}</p>
                        <div>{getStatusBadge(invoice.status, invoice.paidAmount, invoice.totalAmount)}</div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {t("invoicing.detail.date")}
                        </p>
                        <p className="font-medium">{format(new Date(invoice.date), "yyyy/MM/dd")}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t("invoicing.detail.invoice")}</p>
                        <div>
                            {invoice.issueInvoice !== false ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {t("invoicing.detail.invoiceIssued")}
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-gray-500">
                                    {t("invoicing.detail.invoiceNotIssued")}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Company Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {t("invoicing.detail.client")}
                        </h3>
                        <div className="text-sm space-y-1 pl-6">
                            <p className="font-medium">{invoice.company.name}</p>
                            {invoice.company.taxId && <p className="text-muted-foreground">{t("invoicing.detail.taxIdInline")}: {invoice.company.taxId}</p>}
                            {invoice.company.contactName && (
                                <p className="text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {invoice.company.contactName}
                                </p>
                            )}
                            {invoice.company.phone && <p className="text-muted-foreground">{t("invoicing.detail.phoneInline")}: {invoice.company.phone}</p>}
                            {invoice.company.email && <p className="text-muted-foreground">Email: {invoice.company.email}</p>}
                            {invoice.company.address && <p className="text-muted-foreground">{t("invoicing.detail.addressInline")}: {invoice.company.address}</p>}
                        </div>
                    </div>

                    {invoice.provider && (
                        <div className="space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {t("invoicing.detail.providerParty")}
                            </h3>
                            <div className="text-sm space-y-1 pl-6">
                                <p className="font-medium">{invoice.provider.name}</p>
                                {invoice.provider.taxId && <p className="text-muted-foreground">{t("invoicing.detail.taxIdInline")}: {invoice.provider.taxId}</p>}
                                {invoice.provider.contactName && (
                                    <p className="text-muted-foreground flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {invoice.provider.contactName}
                                    </p>
                                )}
                                {invoice.provider.phone && <p className="text-muted-foreground">{t("invoicing.detail.phoneInline")}: {invoice.provider.phone}</p>}
                                {invoice.provider.email && <p className="text-muted-foreground">Email: {invoice.provider.email}</p>}
                                {invoice.provider.address && <p className="text-muted-foreground">{t("invoicing.detail.addressInline")}: {invoice.provider.address}</p>}
                            </div>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-6">
                    {/* Service Items */}
                    <div className="space-y-4">
                        <h3 className="font-semibold">{t("invoicing.detail.serviceItems")}</h3>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="text-left p-3 text-sm font-medium">{t("invoicing.items.name")}</th>
                                        <th className="text-left p-3 text-sm font-medium">{t("invoicing.items.description")}</th>
                                        <th className="text-right p-3 text-sm font-medium">{t("invoicing.items.quantity")}</th>
                                        <th className="text-right p-3 text-sm font-medium">{t("invoicing.items.price")}</th>
                                        <th className="text-right p-3 text-sm font-medium">{t("invoicing.items.amount")}</th>
                                        <th className="text-left p-3 text-sm font-medium">{t("invoicing.items.note")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.filter((item: InvoiceItem) => !item.type || item.type === 'service').length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-3 text-center text-muted-foreground text-sm">{t("invoicing.items.noServiceItems")}</td>
                                        </tr>
                                    ) : (
                                        items.filter((item: InvoiceItem) => !item.type || item.type === 'service').map((item: InvoiceItem, index: number) => (
                                            <tr key={index} className="border-t">
                                                <td className="p-3">{item.name}</td>
                                                <td className="p-3 text-sm text-muted-foreground">{item.description || "-"}</td>
                                                <td className="p-3 text-right">{item.quantity}</td>
                                                <td className="p-3 text-right font-mono">${item.price.toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono">${item.amount.toLocaleString()}</td>
                                                <td className="p-3 text-sm text-muted-foreground">{item.note || "-"}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Reimbursement Items */}
                    {items.some((item: InvoiceItem) => item.type === 'reimbursement') && (
                        <div className="space-y-4">
                            <h3 className="font-semibold">{t("invoicing.detail.reimbursementItems")}</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.items.name")}</th>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.items.description")}</th>
                                            <th className="text-right p-3 text-sm font-medium">{t("invoicing.items.quantity")}</th>
                                            <th className="text-right p-3 text-sm font-medium">{t("invoicing.items.price")}</th>
                                            <th className="text-right p-3 text-sm font-medium">{t("invoicing.items.amount")}</th>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.items.note")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.filter((item: InvoiceItem) => item.type === 'reimbursement').map((item: InvoiceItem, index: number) => (
                                            <tr key={index} className="border-t">
                                                <td className="p-3">{item.name}</td>
                                                <td className="p-3 text-sm text-muted-foreground">{item.description || "-"}</td>
                                                <td className="p-3 text-right">{item.quantity}</td>
                                                <td className="p-3 text-right font-mono">${item.price.toLocaleString()}</td>
                                                <td className="p-3 text-right font-mono">${item.amount.toLocaleString()}</td>
                                                <td className="p-3 text-sm text-muted-foreground">{item.note || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-full md:w-1/2 space-y-2">
                        {(() => {
                            const serviceItems = items.filter((item: InvoiceItem) => !item.type || item.type === 'service');
                            const reimbursementItems = items.filter((item: InvoiceItem) => item.type === 'reimbursement');

                            const serviceSubtotal = Math.round(serviceItems.reduce((sum: number, item: InvoiceItem) => sum + (item.amount || 0), 0));
                            const reimbursementSubtotal = Math.round(reimbursementItems.reduce((sum: number, item: InvoiceItem) => sum + (item.amount || 0), 0));

                            return (
                                <>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t("invoicing.detail.serviceSubtotalUntaxed")}</span>
                                        <span className="font-mono">${serviceSubtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {t("invoicing.form.taxWithRate", {
                                                rate: derivedTaxRate(invoice.amount, invoice.taxAmount),
                                            })}
                                        </span>
                                        <span className="font-mono">${invoice.taxAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm font-medium border-t pt-2 mt-2">
                                        <span>{t("invoicing.detail.serviceTotalTaxed")}</span>
                                        <span className="font-mono">${Math.round(serviceSubtotal + invoice.taxAmount).toLocaleString()}</span>
                                    </div>

                                    {reimbursementSubtotal > 0 && (
                                        <div className="flex justify-between text-sm mt-2">
                                            <span className="text-muted-foreground">{t("invoicing.detail.reimbursementSubtotal")}</span>
                                            <span className="font-mono">${reimbursementSubtotal.toLocaleString()}</span>
                                        </div>
                                    )}

                                    <Separator className="my-2" />

                                    <div className="flex justify-between font-bold text-lg">
                                        <span>{t("invoicing.detail.grandTotal")}</span>
                                        <span className="font-mono">${invoice.totalAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t("invoicing.detail.paid")}</span>
                                        <span className="font-mono text-green-600">${invoice.paidAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                        <span className="text-muted-foreground">{t("invoicing.status.unpaid")}</span>
                                        <span className="font-mono text-red-600">${Math.round(invoice.totalAmount - invoice.paidAmount).toLocaleString()}</span>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>

                {/* Bank Account Information */}
                {invoice.provider?.bankAccounts && invoice.provider.bankAccounts.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-4">
                            <h3 className="font-semibold">{t("invoicing.detail.bankSection")}</h3>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.detail.bankCurrency")}</th>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.detail.bankName")}</th>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.detail.bankBranch")}</th>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.detail.bankAccountNumber")}</th>
                                            <th className="text-left p-3 text-sm font-medium">{t("invoicing.detail.bankAccountHolder")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.provider.bankAccounts.map((account, index) => (
                                            <tr key={index} className="border-t">
                                                <td className="p-3">{account.currency}</td>
                                                <td className="p-3">{account.note || "-"}</td>
                                                <td className="p-3">{account.branch || "-"}</td>
                                                <td className="p-3 font-mono">{account.accountNumber}</td>
                                                <td className="p-3">{account.accountHolder || invoice.provider?.name}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* Reminders */}
                {invoice.reminders && invoice.reminders.length > 0 && (
                    <>
                        <Separator />
                        <div className="space-y-2">
                            <h3 className="font-semibold">{t("invoicing.detail.reminders")}</h3>
                            <div className="space-y-2">
                                {invoice.reminders.map((reminder) => (
                                    <div key={reminder.id} className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                                        <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">
                                                {format(new Date(reminder.date), "yyyy/MM/dd")}
                                            </div>
                                            {reminder.text && (
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {reminder.text}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
