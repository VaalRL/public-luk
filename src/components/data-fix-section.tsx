"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fixPaidAmountDiscrepancies, recalculateAllPaidAmounts } from "@/app/actions/data-fix";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n/context";

// 直接從 server action 推導結果型別，避免與實作脫鉤
type FixResult = Awaited<ReturnType<typeof fixPaidAmountDiscrepancies>>;
type RecalcResult = Awaited<ReturnType<typeof recalculateAllPaidAmounts>>;

export function DataFixSection() {
    const { toast } = useToast();
    const t = useT();
    const [fixing, setFixing] = useState(false);
    const [recalculating, setRecalculating] = useState(false);
    const [fixResult, setFixResult] = useState<FixResult | null>(null);
    const [recalcResult, setRecalcResult] = useState<RecalcResult | null>(null);

    const handleFix = async () => {
        setFixing(true);
        try {
            const result = await fixPaidAmountDiscrepancies();
            setFixResult(result);
        } catch (error) {
            console.error(error);
            toast({
                title: t("dataFix.fixFailed"),
                description: t("dataFix.fixFailedDescription"),
                variant: "destructive",
            });
        } finally {
            setFixing(false);
        }
    };

    const handleRecalculate = async () => {
        setRecalculating(true);
        try {
            const result = await recalculateAllPaidAmounts();
            setRecalcResult(result);
        } catch (error) {
            console.error(error);
            toast({
                title: t("dataFix.recalcFailed"),
                description: t("dataFix.recalcFailedDescription"),
                variant: "destructive",
            });
        } finally {
            setRecalculating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">{t("dataFix.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("dataFix.description")}</p>
            </div>

            <Alert>
                <AlertDescription>
                    <strong>{t("dataFix.warningLabel")}</strong>{t("dataFix.warningText")}
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("dataFix.step1Title")}</CardTitle>
                    <CardDescription>
                        {t("dataFix.step1Description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleFix} disabled={fixing}>
                        {fixing ? t("dataFix.step1Running") : t("dataFix.step1Button")}
                    </Button>

                    {fixResult && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                            <h3 className="font-semibold text-green-800 mb-2">
                                {t("dataFix.step1Done", { n: fixResult.totalFixed })}
                            </h3>
                            {fixResult.fixes.length > 0 && (
                                <div className="space-y-2 text-sm">
                                    {fixResult.fixes.map((fix, idx: number) => (
                                        <div key={idx} className="border-b border-green-100 pb-2">
                                            <div>{t("dataFix.invoiceNumber")}: {fix.invoiceNumber || fix.invoiceId}</div>
                                            <div>{t("dataFix.fixedAmount")}: ${fix.discrepancy.toLocaleString()}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("dataFix.step2Title")}</CardTitle>
                    <CardDescription>
                        {t("dataFix.step2Description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleRecalculate} disabled={recalculating}>
                        {recalculating ? t("dataFix.step2Running") : t("dataFix.step2Button")}
                    </Button>

                    {recalcResult && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                            <h3 className="font-semibold text-blue-800 mb-2">
                                {t("dataFix.step2Done", { n: recalcResult.totalUpdated })}
                            </h3>
                            {recalcResult.updates.length > 0 && (
                                <div className="space-y-2 text-sm">
                                    {recalcResult.updates.map((update, idx: number) => (
                                        <div key={idx} className="border-b border-blue-100 pb-2">
                                            <div>{t("dataFix.invoiceNumber")}: {update.invoiceNumber || update.invoiceId}</div>
                                            <div>
                                                {t("dataFix.paidAmountLabel")}: ${update.oldPaidAmount.toLocaleString()} → $
                                                {update.newPaidAmount.toLocaleString()}
                                            </div>
                                            <div>
                                                {t("dataFix.statusLabel")}: {update.oldStatus} → {update.newStatus}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
