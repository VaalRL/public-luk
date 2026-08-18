"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";
import { AlertCircle } from "lucide-react";
import { Transaction } from "./types";

interface AmbiguousTransactionsProps {
    transactions: Transaction[];
}

export function AmbiguousTransactions({
    transactions,
}: AmbiguousTransactionsProps) {
    const t = useT();
    const ambiguousTx = transactions.filter((tx) => tx.status === "ambiguous");

    if (ambiguousTx.length === 0) return null;

    return (
        <Card className="border-2 border-orange-500/50 bg-orange-500/10 dark:border-orange-400/50 dark:bg-orange-400/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertCircle className="w-5 h-5" />
                    {t("ambiguous.title")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {ambiguousTx.map((tx) => (
                        <div
                            key={tx.id}
                            className="flex justify-between items-center p-3 bg-background rounded border border-orange-500/30 dark:border-orange-400/30"
                        >
                            <div>
                                <span className="text-sm font-medium">
                                    {new Date(tx.date).toLocaleDateString("zh-TW")}
                                </span>
                                <span className="mx-2 text-muted-foreground">|</span>
                                <span className="text-sm">
                                    {tx.note || tx.description || "-"}
                                </span>
                            </div>
                            <span className="font-mono font-medium">
                                ${tx.deposit.toLocaleString()}
                            </span>
                        </div>
                    ))}
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-4">
                    ⚠️
                    {t("ambiguous.description")}
                </p>
            </CardContent>
        </Card>
    );
}
