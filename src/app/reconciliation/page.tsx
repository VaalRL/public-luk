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

// Force dynamic rendering to avoid build-time database access
export const dynamic = 'force-dynamic';

export default async function ReconciliationPage() {
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
                    <h2 className="text-3xl font-bold tracking-tight">銷帳作業</h2>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HelpCircle className="h-5 w-5 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                                <p className="font-semibold mb-2">銷帳邏輯說明</p>
                                <ul className="space-y-1 text-sm">
                                    <li>• 系統會自動匹配銀行交易與帳單</li>
                                    <li>• 使用 FIFO（先進先出）原則進行匹配</li>
                                    <li>• 支援部分付款和多筆交易對應單一帳單</li>
                                    <li>• 可手動調整匹配結果</li>
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <p className="text-muted-foreground mt-2">
                    匹配銀行交易與帳單，自動化銷帳流程。
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
