"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, AlertCircle, Building2, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/i18n/context";
import type { MessageKey } from "@/lib/i18n/messages";

type Stats = {
    totalReceivables: number;
    thisMonthBilled: number;
    thisMonthCollected: number;
    outstandingBalance: number;
    totalCompanies: number;
    totalInvoices: number;
    totalPaidAmount?: number;
    previousMonthsCollected?: number;
};

export function DashboardKPIs({ stats }: { stats: Stats }) {
    const t = useT();
    const kpis: {
        titleKey: MessageKey;
        value: number;
        icon: typeof FileText;
        color: string;
        bgColor: string;
        href: string;
        isCount?: boolean;
    }[] = [
        {
            titleKey: "dashboard.kpi.billedThisMonth",
            value: stats.thisMonthBilled,
            icon: FileText,
            color: "text-blue-600",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
            href: "/invoicing",
        },
        {
            titleKey: "dashboard.kpi.collectedThisMonth",
            value: stats.thisMonthCollected,
            icon: CheckCircle2,
            color: "text-green-600",
            bgColor: "bg-green-50 dark:bg-green-900/20",
            href: "/reconciliation#summary",
        },
        {
            titleKey: "dashboard.kpi.outstanding",
            value: stats.outstandingBalance,
            icon: AlertCircle,
            color: "text-amber-600",
            bgColor: "bg-amber-50 dark:bg-amber-900/20",
            href: "/reconciliation#summary",
        },
        {
            titleKey: "dashboard.kpi.totalReceivables",
            value: stats.totalReceivables,
            icon: DollarSign,
            color: "text-purple-600",
            bgColor: "bg-purple-50 dark:bg-purple-900/20",
            href: "/invoicing",
        },
        {
            titleKey: "dashboard.kpi.companies",
            value: stats.totalCompanies,
            icon: Building2,
            color: "text-indigo-600",
            bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
            isCount: true,
            href: "/settings",
        },
        {
            titleKey: "dashboard.kpi.invoices",
            value: stats.totalInvoices,
            icon: TrendingUp,
            color: "text-pink-600",
            bgColor: "bg-pink-50 dark:bg-pink-900/20",
            isCount: true,
            href: "/invoicing",
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const CardElement = (
                    <Card key={kpi.titleKey} className={kpi.href ? "transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer h-full" : "h-full"}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                            <CardTitle className="text-xs font-medium text-muted-foreground">
                                {t(kpi.titleKey)}
                            </CardTitle>
                            <div className={`p-1.5 rounded-lg ${kpi.bgColor}`}>
                                <Icon className={`w-3 h-3 ${kpi.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="text-xl font-bold font-mono">
                                {kpi.isCount
                                    ? kpi.value
                                    : `$${kpi.value.toLocaleString()}`}
                            </div>
                        </CardContent>
                    </Card>
                );

                if (kpi.href) {
                    return (
                        <Link href={kpi.href} key={kpi.titleKey}>
                            {CardElement}
                        </Link>
                    );
                }

                return CardElement;
            })}
        </div>
    );
}
