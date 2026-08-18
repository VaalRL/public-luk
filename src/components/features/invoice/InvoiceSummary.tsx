"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";

interface InvoiceSummaryProps {
    serviceSubtotal: number;
    serviceTax: number;
    serviceTotal: number;
    reimbursementTotal: number;
    grandTotal: number;
    taxRate: number;
}

export function InvoiceSummary({
    serviceSubtotal,
    serviceTax,
    serviceTotal,
    reimbursementTotal,
    grandTotal,
    taxRate,
}: InvoiceSummaryProps) {
    const t = useT();
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("invoicing.summary.serviceSubtotal")}</span>
                        <span className="font-mono">${serviceSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("invoicing.form.taxWithRate", { rate: taxRate })}</span>
                        <span className="font-mono">${serviceTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("invoicing.summary.serviceTotal")}</span>
                        <span className="font-mono font-medium">${serviceTotal.toLocaleString()}</span>
                    </div>
                    {reimbursementTotal !== 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("invoicing.summary.reimbursementTotal")}</span>
                            <span className="font-mono">${reimbursementTotal.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>{t("invoicing.summary.grandTotal")}</span>
                        <span className="font-mono">${grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
