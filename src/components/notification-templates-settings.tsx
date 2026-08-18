"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateNotificationTemplate } from "@/app/actions/notification-templates";
import { MessageSquare, Save, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useT } from "@/lib/i18n/context";

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
    const t = useT();
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
                title: t("common.saveSuccess"),
                description: t("notificationTemplate.saved"),
            });
        } catch {
            toast({
                title: t("common.saveFailed"),
                description: t("common.retryLater"),
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const copyExample = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: t("notificationTemplate.copied"),
            description: t("notificationTemplate.copiedDescription"),
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {t("notificationTemplate.title")}
                    </CardTitle>
                    <CardDescription>
                        {t("notificationTemplate.description")}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 催繳文案 */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="payment-reminder" className="text-base font-semibold">
                                {t("notificationTemplate.reminderTitle")}
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyExample(t("notificationTemplate.reminderExample"))}
                            >
                                <Copy className="w-4 h-4 mr-1" />
                                {t("notificationTemplate.copyExample")}
                            </Button>
                        </div>
                        <Textarea
                            id="payment-reminder"
                            value={paymentReminder}
                            onChange={(e) => setPaymentReminder(e.target.value)}
                            placeholder={t("notificationTemplate.reminderPlaceholder")}
                            rows={4}
                            className="font-mono text-sm"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t("notificationTemplate.reminderHint")}
                        </p>
                    </div>

                    {/* 已繳文案 */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="payment-confirmed" className="text-base font-semibold">
                                {t("notificationTemplate.paidTitle")}
                            </Label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyExample(t("notificationTemplate.paidExample"))}
                            >
                                <Copy className="w-4 h-4 mr-1" />
                                {t("notificationTemplate.copyExample")}
                            </Button>
                        </div>
                        <Textarea
                            id="payment-confirmed"
                            value={paymentConfirmed}
                            onChange={(e) => setPaymentConfirmed(e.target.value)}
                            placeholder={t("notificationTemplate.paidPlaceholder")}
                            rows={4}
                            className="font-mono text-sm"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t("notificationTemplate.paidHint")}
                        </p>
                    </div>

                    {/* 儲存按鈕 */}
                    <div className="flex justify-end pt-4">
                        <Button onClick={handleSave} disabled={isSaving}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? t("notificationTemplate.saving") : t("notificationTemplate.submit")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 變數說明 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">{t("notificationTemplate.variables")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{amount}"}</code>
                            <p className="text-muted-foreground mt-1">{t("notificationTemplate.varAmount")}</p>
                        </div>
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{invoiceNumber}"}</code>
                            <p className="text-muted-foreground mt-1">{t("notificationTemplate.varInvoiceNumber")}</p>
                        </div>
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{companyName}"}</code>
                            <p className="text-muted-foreground mt-1">{t("notificationTemplate.varCompanyName")}</p>
                        </div>
                        <div>
                            <code className="bg-muted px-2 py-1 rounded">{"{date}"}</code>
                            <p className="text-muted-foreground mt-1">{t("notificationTemplate.varDate")}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
