"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateNotificationTemplate } from "@/app/actions/notification-templates";
import { MessageSquare, Save, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type NotificationTemplate = {
    id: string;
    type: string;
    template: string;
};

interface NotificationTemplatesSettingsProps {
    templates: NotificationTemplate[];
}

export function NotificationTemplatesSettings({ templates }: NotificationTemplatesSettingsProps) {
    const { toast } = useToast();
    const [paymentReminder, setPaymentReminder] = useState(
        templates.find(t => t.type === "payment_reminder")?.template || ""
    );
    const [paymentConfirmed, setPaymentConfirmed] = useState(
        templates.find(t => t.type === "payment_confirmed")?.template || ""
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await Promise.all([
                updateNotificationTemplate("payment_reminder", paymentReminder),
                updateNotificationTemplate("payment_confirmed", paymentConfirmed)
            ]);

            toast({
                title: "儲存成功",
                description: "通知文案已更新",
            });
        } catch {
            toast({
                title: "儲存失敗",
                description: "請稍後再試",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const copyExample = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "已複製",
            description: "範例文案已複製到剪貼簿",
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        通知文案設定
                    </CardTitle>
                    <CardDescription>
                        自訂催繳與已繳通知文案，支援變數：{"{amount}"} (金額)、{"{invoiceNumber}"} (單號)、{"{companyName}"} (公司名稱)、{"{date}"} (日期)
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 催繳文案 */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="payment-reminder" className="text-base font-semibold">
                                催繳文案（未銷帳）
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyExample("您好，提醒您尚有應收帳款 $15,000 元（單號：LJ20231128#01），請盡快安排付款。謝謝！")}
                            >
                                <Copy className="w-4 h-4 mr-1" />
                                複製範例
                            </Button>
                        </div>
                        <Textarea
                            id="payment-reminder"
                            value={paymentReminder}
                            onChange={(e) => setPaymentReminder(e.target.value)}
                            placeholder="輸入催繳文案範本..."
                            rows={4}
                            className="font-mono text-sm"
                        />
                        <p className="text-sm text-muted-foreground">
                            此文案會顯示在未銷帳的帳單資料末端
                        </p>
                    </div>

                    {/* 已繳文案 */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="payment-confirmed" className="text-base font-semibold">
                                已繳文案（已銷帳）
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyExample("您好，已確認收到款項 $15,000 元（單號：LJ20231128#01），感謝您的配合！")}
                            >
                                <Copy className="w-4 h-4 mr-1" />
                                複製範例
                            </Button>
                        </div>
                        <Textarea
                            id="payment-confirmed"
                            value={paymentConfirmed}
                            onChange={(e) => setPaymentConfirmed(e.target.value)}
                            placeholder="輸入已繳文案範本..."
                            rows={4}
                            className="font-mono text-sm"
                        />
                        <p className="text-sm text-muted-foreground">
                            此文案會顯示在已銷帳的帳單資料末端
                        </p>
                    </div>

                    {/* 儲存按鈕 */}
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? "儲存中..." : "儲存設定"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 變數說明 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">可用變數說明</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{amount}"}</code>
                            <p className="text-muted-foreground mt-1">帳款金額（自動格式化）</p>
                        </div>
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{invoiceNumber}"}</code>
                            <p className="text-muted-foreground mt-1">帳單號碼</p>
                        </div>
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{companyName}"}</code>
                            <p className="text-muted-foreground mt-1">公司名稱</p>
                        </div>
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{date}"}</code>
                            <p className="text-muted-foreground mt-1">日期</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
