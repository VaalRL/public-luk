"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

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
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">服務項目小計：</span>
                        <span className="font-mono">${serviceSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">稅額 ({taxRate}%)：</span>
                        <span className="font-mono">${serviceTax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">服務項目總計：</span>
                        <span className="font-mono font-medium">${serviceTotal.toLocaleString()}</span>
                    </div>
                    {reimbursementTotal !== 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">代墊項目總計：</span>
                            <span className="font-mono">${reimbursementTotal.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>總計：</span>
                        <span className="font-mono">${grandTotal.toLocaleString()}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
