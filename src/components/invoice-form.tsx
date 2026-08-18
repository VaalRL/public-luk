"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, CheckCircle } from "lucide-react";
import { InvoiceDownloadButton } from "@/components/invoice-download-button";
import { useInvoiceForm } from "@/hooks/use-invoice-form";
import {
    InvoiceFormHeader,
    InvoiceItemsTable,
    InvoiceSummary,
    InvoiceReminderSection,
    InvoiceFormActions,
    type Company,
    type Invoice,
    type ItemTemplate,
} from "@/components/features/invoice";

interface InvoiceFormProps {
    companies: Company[];
    itemTemplates: ItemTemplate[];
    initialData?: Invoice | null;
    existingInvoices?: Invoice[];
    /** 新帳單的預設標題，來自報價單版型設定 */
    defaultTitle?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function InvoiceForm({
    companies,
    itemTemplates,
    initialData,
    existingInvoices: _existingInvoices = [],
    defaultTitle,
    onSuccess,
    onCancel,
}: InvoiceFormProps) {
    const {
        form,
        state,
        actions,
        calculations,
    } = useInvoiceForm({
        initialData,
        itemTemplates,
        defaultTitle,
        onSuccess,
        onCancel,
    });

    const {
        items,
        reminders,
        isSubmitting,
        savedInvoice,
        openCompany,
        openProvider,
        taxRate,
        issueInvoice,
        companyId,
        providerId,
        date,
        invoiceNumber,
        title,
    } = state;

    const {
        setReminders,
        setOpenCompany,
        setOpenProvider,
        addItem,
        removeItem,
        updateItem,
        applyTemplate,
        onSubmit,
        resetForm,
    } = actions;

    const {
        calculateServiceSubtotal,
        calculateReimbursementTotal,
        calculateTax,
        calculateTotal,
    } = calculations;

    const { setValue, handleSubmit } = form;

    // Success view
    if (savedInvoice) {
        return (
            <Card className="border-2 border-green-500/50 bg-green-500/10 dark:border-green-400/50 dark:bg-green-400/10">
                <CardContent className="pt-6 text-center space-y-4">
                    <div className="flex justify-center">
                        <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-green-800 dark:text-green-300">
                        帳單已儲存！
                    </h3>
                    <p className="text-green-700 dark:text-green-400">
                        單號:{" "}
                        {savedInvoice.invoiceNumber || savedInvoice.id.slice(0, 8)}
                    </p>

                    <div className="flex justify-center gap-4 pt-4">
                        <InvoiceDownloadButton
                            invoice={savedInvoice}
                            fileName={`Invoice_${savedInvoice.invoiceNumber || savedInvoice.id.slice(0, 8)
                                }.pdf`}
                        />

                        <Button
                            variant="outline"
                            onClick={resetForm}
                        >
                            建立新帳單 / 返回列表
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isFormDisabled = !companyId || !providerId;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {onCancel && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onCancel}
                            className="mr-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    )}
                    <FileText className="w-5 h-5" />
                    {initialData ? "編輯帳單" : "建立帳單"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form
                    onSubmit={handleSubmit(onSubmit)}
                    onKeyDown={(e) => {
                        if (
                            e.key === "Enter" &&
                            (e.target as HTMLElement).tagName !== "TEXTAREA"
                        ) {
                            e.preventDefault();
                        }
                    }}
                    className="space-y-6"
                >
                    <InvoiceFormHeader
                        companyId={companyId}
                        providerId={providerId}
                        date={date}
                        invoiceNumber={invoiceNumber || ""}
                        title={title}
                        issueInvoice={issueInvoice}
                        isFormDisabled={isFormDisabled}
                        companies={companies}
                        openCompany={openCompany}
                        openProvider={openProvider}
                        setOpenCompany={setOpenCompany}
                        setOpenProvider={setOpenProvider}
                        onCompanyChange={(id) => setValue("companyId", id)}
                        onProviderChange={(id) => setValue("providerId", id)}
                        onDateChange={(d) => d && setValue("date", d)}
                        onInvoiceNumberChange={(v) => setValue("invoiceNumber", v)}
                        onTitleChange={(v) => setValue("title", v)}
                        onIssueInvoiceChange={(checked) => setValue("issueInvoice", checked)}
                    />

                    <InvoiceItemsTable
                        items={items}
                        itemTemplates={itemTemplates}
                        isFormDisabled={isFormDisabled}
                        updateItem={updateItem}
                        removeItem={removeItem}
                        applyTemplate={applyTemplate}
                        addItem={addItem}
                    />

                    <div className="flex justify-end">
                        <div className="w-full md:w-1/3">
                            <InvoiceSummary
                                serviceSubtotal={calculateServiceSubtotal}
                                serviceTax={calculateTax}
                                serviceTotal={calculateServiceSubtotal + calculateTax}
                                reimbursementTotal={calculateReimbursementTotal}
                                grandTotal={calculateTotal}
                                taxRate={taxRate}
                            />
                        </div>
                    </div>

                    <InvoiceReminderSection
                        reminders={reminders}
                        isFormDisabled={isFormDisabled}
                        onRemindersChange={setReminders}
                    />

                    <InvoiceFormActions
                        isSubmitting={isSubmitting}
                        isFormDisabled={isFormDisabled}
                        onCancel={onCancel}
                    />
                </form>
            </CardContent>
        </Card>
    );
}
