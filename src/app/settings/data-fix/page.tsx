"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fixPaidAmountDiscrepancies, recalculateAllPaidAmounts } from "@/app/actions/data-fix";
import { useToast } from "@/hooks/use-toast";

// 直接從 server action 推導結果型別，避免與實作脫鉤
type FixResult = Awaited<ReturnType<typeof fixPaidAmountDiscrepancies>>;
type RecalcResult = Awaited<ReturnType<typeof recalculateAllPaidAmounts>>;

export default function DataFixPage() {
    const { toast } = useToast();
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
                title: "修復失敗",
                description: "修復失敗，請稍後再試",
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
                title: "計算失敗",
                description: "重新計算失敗，請稍後再試",
                variant: "destructive",
            });
        } finally {
            setRecalculating(false);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold">數據修復工具</h1>
                <p className="text-muted-foreground">修復帳單付款金額與銷帳記錄的不一致問題</p>
            </div>

            <Alert>
                <AlertDescription>
                    <strong>注意：</strong>這些工具會修改數據庫中的數據。建議在執行前先備份數據庫。
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>步驟 1：補錄缺失的銷帳記錄</CardTitle>
                    <CardDescription>
                        為所有 paidAmount &gt; 0 但缺少對應銷帳記錄的帳單創建補錄記錄
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleFix} disabled={fixing}>
                        {fixing ? "修復中..." : "執行修復"}
                    </Button>

                    {fixResult && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                            <h3 className="font-semibold text-green-800 mb-2">
                                修復完成！共修復 {fixResult.totalFixed} 筆記錄
                            </h3>
                            {fixResult.fixes.length > 0 && (
                                <div className="space-y-2 text-sm">
                                    {fixResult.fixes.map((fix, idx: number) => (
                                        <div key={idx} className="border-b border-green-100 pb-2">
                                            <div>帳單號碼: {fix.invoiceNumber || fix.invoiceId}</div>
                                            <div>補錄金額: ${fix.discrepancy.toLocaleString()}</div>
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
                    <CardTitle>步驟 2：重新計算所有帳單的付款金額</CardTitle>
                    <CardDescription>
                        根據銷帳記錄重新計算每張帳單的 paidAmount 和 status
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleRecalculate} disabled={recalculating}>
                        {recalculating ? "計算中..." : "重新計算"}
                    </Button>

                    {recalcResult && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                            <h3 className="font-semibold text-blue-800 mb-2">
                                計算完成！共更新 {recalcResult.totalUpdated} 筆記錄
                            </h3>
                            {recalcResult.updates.length > 0 && (
                                <div className="space-y-2 text-sm">
                                    {recalcResult.updates.map((update, idx: number) => (
                                        <div key={idx} className="border-b border-blue-100 pb-2">
                                            <div>帳單號碼: {update.invoiceNumber || update.invoiceId}</div>
                                            <div>
                                                付款金額: ${update.oldPaidAmount.toLocaleString()} → $
                                                {update.newPaidAmount.toLocaleString()}
                                            </div>
                                            <div>
                                                狀態: {update.oldStatus} → {update.newStatus}
                                            </div>
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
                    <CardTitle>使用說明</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <strong>問題原因：</strong>
                        當手動修改帳單的「已付金額」時，沒有創建對應的銷帳記錄，導致數據不一致。
                    </p>
                    <p>
                        <strong>修復流程：</strong>
                    </p>
                    <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>先執行「步驟 1」，為所有缺少銷帳記錄的付款創建補錄記錄</li>
                        <li>再執行「步驟 2」，重新計算所有帳單的付款金額，確保數據一致</li>
                        <li>完成後，檢查概覽的數據是否正確</li>
                    </ol>
                    <p className="text-amber-600">
                        <strong>重要：</strong>
                        未來請不要直接修改帳單的「已付金額」。如需記錄付款，請使用銷帳功能或「手動記錄付款」功能。
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
