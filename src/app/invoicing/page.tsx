import { getCompanies } from "@/app/actions/company";
import { getInvoices } from "@/app/actions/invoice";
import { getInvoiceItemTemplates } from "@/app/actions/invoice-item-template";
import { getPdfTemplate } from "@/app/actions/pdf-template";
import { getT } from "@/lib/i18n/server";
import { InvoicingPageClient } from "@/components/invoicing-page-client";

export const dynamic = 'force-dynamic';

export default async function InvoicingPage() {
    const t = await getT();
    const [companies, invoices, itemTemplates, pdfTemplate] = await Promise.all([
        getCompanies(),
        getInvoices(),
        getInvoiceItemTemplates(),
        getPdfTemplate(),
    ]);

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t("invoicing.title")}</h2>
                <p className="text-muted-foreground">
                    {t("invoicing.subtitle")}
                </p>
            </div>

            <InvoicingPageClient
                companies={companies}
                invoices={invoices}
                itemTemplates={itemTemplates}
                defaultTitle={pdfTemplate.labels.documentTitle}
            />
        </div>
    );
}
