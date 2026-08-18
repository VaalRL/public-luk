import { getUnmatchedTransactions, getAllInvoices, getOverpayments } from "@/app/actions/reconciliation";
import { getNotificationTemplates } from "@/app/actions/notification-templates";
import ReconciliationPageClient from "@/components/reconciliation-page-client";
import { HelpCircle } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getT } from "@/lib/i18n/server";

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function ReconciliationPage() {
    const t = await getT();
    const [transactions, invoices, notificationTemplates, overpayments] = await Promise.all([
        getUnmatchedTransactions(),
        getAllInvoices(),
        getNotificationTemplates(),
        getOverpayments(),
    ]);

    return (
        <div className="space-y-8">
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="text-3xl font-bold tracking-tight">{t("reconciliation.title")}</h2>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                                <p className="font-semibold mb-2">{t("reconciliation.help.title")}</p>
                                <ul className="space-y-1 text-sm">
                                    <li>• {t("reconciliation.help.autoMatch")}</li>
                                    <li>• {t("reconciliation.help.fifo")}</li>
                                    <li>• {t("reconciliation.help.partial")}</li>
                                    <li>• {t("reconciliation.help.manual")}</li>
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <p className="text-muted-foreground mt-2">
                    {t("reconciliation.subtitle")}
                </p>
            </div>

            <ReconciliationPageClient
                initialTransactions={transactions}
                initialInvoices={invoices}
                notificationTemplates={notificationTemplates}
                overpayments={overpayments}
            />
        </div>
    );
}
