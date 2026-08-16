import { getCompanies } from "@/app/actions/company";
import { getInvoices } from "@/app/actions/invoice";
import { getInvoiceItemTemplates } from "@/app/actions/invoice-item-template";
import { InvoicingPageClient } from "@/components/invoicing-page-client";

export const dynamic = 'force-dynamic';

export default async function InvoicingPage() {
    const [companies, invoices, itemTemplates] = await Promise.all([
        getCompanies(),
        getInvoices(),
        getInvoiceItemTemplates(),
    ]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">立帳管理</h2>
                <p className="text-muted-foreground">
                    管理帳單，追蹤付款狀態。
                </p>
            </div>

            <InvoicingPageClient companies={companies} invoices={invoices} itemTemplates={itemTemplates} />
        </div>
    );
}
