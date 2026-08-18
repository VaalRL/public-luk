"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { InvoiceForm } from "@/components/invoice-form";
import { InvoiceList } from "@/components/invoice-list";
import { InvoiceDetailView } from "@/components/invoice-detail-view";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

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
        last5Digits: string;
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
    issueInvoice?: boolean;
    reminders?: { id: string; date: Date }[];
    company: Company;
    provider?: Company | null;
};

interface InvoicingPageClientProps {
    companies: Company[];
    invoices: Invoice[];
    itemTemplates: { id: string; name: string; price: number; quantity: number }[];
    /** 新帳單的預設標題，來自報價單版型設定 */
    defaultTitle: string;
}

export function InvoicingPageClient({ companies, invoices, itemTemplates, defaultTitle }: InvoicingPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [viewMode, setViewMode] = useState<'list' | 'view' | 'edit'>('list');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Handle URL params on mount and when they change
    useEffect(() => {
        const invoiceId = searchParams.get('id');
        const mode = searchParams.get('mode');

        if (invoiceId) {
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- 依 URL query 同步畫面狀態，來源是路由而非 render 期間的資料
                setSelectedInvoice(invoice);
                setViewMode(mode === 'edit' ? 'edit' : 'view');
            }
        } else if (mode === 'edit') {
            // Creating a new invoice
            setSelectedInvoice(null);
            setViewMode('edit');
        } else {
            // Default to list view
            setViewMode('list');
            setSelectedInvoice(null);
        }
    }, [searchParams, invoices]);

    const handleView = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setViewMode('view');
        router.push(`/invoicing?id=${invoice.id}`);
    };

    const handleEdit = (invoice?: Invoice) => {
        if (invoice) {
            setSelectedInvoice(invoice);
            setViewMode('edit');
            router.push(`/invoicing?id=${invoice.id}&mode=edit`);
        } else if (selectedInvoice) {
            setViewMode('edit');
            router.push(`/invoicing?id=${selectedInvoice.id}&mode=edit`);
        }
    };

    const handleCreateNew = () => {
        setSelectedInvoice(null);
        setViewMode('edit');
        router.push('/invoicing?mode=edit');
    };

    const handleSuccess = () => {
        router.refresh();
    };

    const handleCancel = () => {
        setViewMode('list');
        setSelectedInvoice(null);
        router.push('/invoicing');
        router.refresh();
    };

    const handleBack = () => {
        setViewMode('list');
        setSelectedInvoice(null);
        router.push('/invoicing');
    };

    // Edit mode
    if (viewMode === 'edit') {
        return (
            <InvoiceForm
                companies={companies}
                itemTemplates={itemTemplates}
                defaultTitle={defaultTitle}
                initialData={selectedInvoice}
                existingInvoices={invoices}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
            />
        );
    }

    // View mode (read-only detail)
    if (viewMode === 'view' && selectedInvoice) {
        return (
            <InvoiceDetailView
                invoice={selectedInvoice}
                onEdit={() => handleEdit()}
                onBack={handleBack}
            />
        );
    }

    // List mode
    return (
        <div className="space-y-8">
            <div className="flex justify-end">
                <Button onClick={handleCreateNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    建立新帳單
                </Button>
            </div>

            <InvoiceList invoices={invoices} onEdit={handleEdit} onView={handleView} />
        </div>
    );
}
