"use client";

import { useState } from "react";
import { BankStatementUpload } from "@/components/bank-statement-upload";
import { ReconciliationInterface } from "@/components/reconciliation-interface";
import {
    Transaction,
    Invoice,
    Overpayment,
    NotificationTemplate,
} from "@/components/features/reconciliation";

export default function ReconciliationPageClient({
    initialTransactions,
    initialInvoices,
    notificationTemplates = [],
    overpayments = [],
}: {
    initialTransactions: Transaction[];
    initialInvoices: Invoice[];
    notificationTemplates?: NotificationTemplate[];
    overpayments?: Overpayment[];
}) {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleUploadComplete = () => {
        setRefreshKey((prev) => prev + 1);
        window.location.reload();
    };

    return (
        <div className="space-y-8">
            <BankStatementUpload onUploadComplete={handleUploadComplete} />

            <ReconciliationInterface
                key={refreshKey}
                transactions={initialTransactions}
                invoices={initialInvoices}
                notificationTemplates={notificationTemplates}
                overpayments={overpayments}
            />
        </div>
    );
}
