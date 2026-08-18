"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileCode2, DatabaseBackup, FileText, FileSignature, Info, AlertTriangle, MessageSquare, Activity, Shield } from "lucide-react";
import { useSettingsReminder } from "@/hooks/use-settings-reminder";
import { NotificationDot } from "@/components/ui/notification-dot";
import { useHiddenMode } from "@/store/use-hidden-mode";
import { useT } from "@/lib/i18n/context";

export function SettingsTabsList() {
    const { showCompanyReminder, showInvoiceItemReminder, showParserReminder } = useSettingsReminder();
    const isHiddenModeEnabled = useHiddenMode((state) => state.isEnabled);
    const t = useT();

    return (
        <aside className="w-full md:w-64 shrink-0">
            <TabsList className="flex flex-col h-auto items-stretch bg-transparent p-0 space-y-1">
                <TabsTrigger
                    value="company"
                    className="relative justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <Building2 className="w-4 h-4 mr-2" />
                    {t("settings.tabs.company")}
                    <NotificationDot show={showCompanyReminder} size="sm" position="inline" />
                </TabsTrigger>
                <TabsTrigger
                    value="parser"
                    className="relative justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <FileCode2 className="w-4 h-4 mr-2" />
                    {t("settings.tabs.parser")}
                    <NotificationDot show={showParserReminder} size="sm" position="inline" />
                </TabsTrigger>
                <TabsTrigger
                    value="invoice-items"
                    className="relative justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <FileText className="w-4 h-4 mr-2" />
                    {t("settings.tabs.invoiceItems")}
                    <NotificationDot show={showInvoiceItemReminder} size="sm" position="inline" />
                </TabsTrigger>
                <TabsTrigger
                    value="pdf-template"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <FileSignature className="w-4 h-4 mr-2" />
                    {t("settings.tabs.pdfTemplate")}
                </TabsTrigger>
                <TabsTrigger
                    value="notifications"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t("settings.tabs.notifications")}
                </TabsTrigger>
                {isHiddenModeEnabled && (
                    <>
                        <TabsTrigger
                            value="monitoring"
                            className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            {t("settings.tabs.monitoring")}
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            {t("settings.tabs.security")}
                        </TabsTrigger>
                    </>
                )}
                <TabsTrigger
                    value="backup"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <DatabaseBackup className="w-4 h-4 mr-2" />
                    {t("settings.tabs.backup")}
                </TabsTrigger>
                <TabsTrigger
                    value="about"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <Info className="w-4 h-4 mr-2" />
                    {t("settings.tabs.about")}
                </TabsTrigger>
                <TabsTrigger
                    value="danger"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground text-red-600 dark:text-red-400"
                >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {t("settings.tabs.danger")}
                </TabsTrigger>
            </TabsList>
        </aside>
    );
}
