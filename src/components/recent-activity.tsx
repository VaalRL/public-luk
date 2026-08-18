"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

type RecentInvoice = {
    id: string;
    invoiceNumber: string | null;
    totalAmount: number;
    createdAt: Date;
    company: {
        name: string;
    };
};

type RecentReconciliation = {
    id: string;
    amount: number;
    createdAt: Date;
    invoice: {
        invoiceNumber: string | null;
        company: {
            name: string;
        };
    };
};

export function RecentActivity({
    recentInvoices,
    recentReconciliations,
}: {
    recentInvoices: RecentInvoice[];
    recentReconciliations: RecentReconciliation[];
}) {
    const t = useT();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        {t("dashboard.activity.recentInvoices")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                            {recentInvoices.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {t("dashboard.activity.noInvoices")}
                                </p>
                            ) : (
                                recentInvoices.map((invoice) => (
                                    <div
                                        key={invoice.id}
                                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{invoice.company.name}</p>
                                            <p className="text-sm text-muted-foreground font-mono">
                                                {invoice.invoiceNumber || t("dashboard.activity.noNumber")}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                                    {formatDistanceToNow(new Date(invoice.createdAt), {
                                                        addSuffix: true,
                                                        locale: zhTW,
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono font-bold">
                                                ${invoice.totalAmount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        {t("dashboard.activity.recentReconciliations")}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                            {recentReconciliations.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    {t("dashboard.activity.noReconciliations")}
                                </p>
                            ) : (
                                recentReconciliations.map((rec) => (
                                    <div
                                        key={rec.id}
                                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{rec.invoice.company.name}</p>
                                            <p className="text-sm text-muted-foreground font-mono">
                                                {rec.invoice.invoiceNumber || t("dashboard.activity.noNumber")}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <p className="text-xs text-muted-foreground" suppressHydrationWarning>
                                                    {formatDistanceToNow(new Date(rec.createdAt), {
                                                        addSuffix: true,
                                                        locale: zhTW,
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="default" className="bg-green-600">
                                                {t("dashboard.activity.received")}
                                            </Badge>
                                            <p className="font-mono font-bold mt-1">
                                                ${rec.amount.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}
