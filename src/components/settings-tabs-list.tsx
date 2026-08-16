"use client";

import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, FileCode2, DatabaseBackup, FileText, Info, AlertTriangle, MessageSquare, Activity, Shield } from "lucide-react";
import { useSettingsReminder } from "@/hooks/use-settings-reminder";
import { NotificationDot } from "@/components/ui/notification-dot";
import { useHiddenMode } from "@/store/use-hidden-mode";

export function SettingsTabsList() {
    const { showCompanyReminder, showInvoiceItemReminder, showParserReminder } = useSettingsReminder();
    const isHiddenModeEnabled = useHiddenMode((state) => state.isEnabled);

    return (
        <aside className="w-full md:w-64 shrink-0">
            <TabsList className="flex flex-col h-auto items-stretch bg-transparent p-0 space-y-1">
                <TabsTrigger
                    value="company"
                    className="relative justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <Building2 className="w-4 h-4 mr-2" />
                    公司管理
                    <NotificationDot show={showCompanyReminder} size="sm" position="inline" />
                </TabsTrigger>
                <TabsTrigger
                    value="parser"
                    className="relative justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <FileCode2 className="w-4 h-4 mr-2" />
                    銀行明細解析管理
                    <NotificationDot show={showParserReminder} size="sm" position="inline" />
                </TabsTrigger>
                <TabsTrigger
                    value="invoice-items"
                    className="relative justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <FileText className="w-4 h-4 mr-2" />
                    帳單項目管理
                    <NotificationDot show={showInvoiceItemReminder} size="sm" position="inline" />
                </TabsTrigger>
                <TabsTrigger
                    value="notifications"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    通知文案設定
                </TabsTrigger>
                {isHiddenModeEnabled && (
                    <>
                        <TabsTrigger
                            value="monitoring"
                            className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                        >
                            <Activity className="w-4 h-4 mr-2" />
                            系統監控
                        </TabsTrigger>
                        <TabsTrigger
                            value="security"
                            className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            安全審計
                        </TabsTrigger>
                    </>
                )}
                <TabsTrigger
                    value="backup"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <DatabaseBackup className="w-4 h-4 mr-2" />
                    資料備份與還原
                </TabsTrigger>
                <TabsTrigger
                    value="about"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground"
                >
                    <Info className="w-4 h-4 mr-2" />
                    關於
                </TabsTrigger>
                <TabsTrigger
                    value="danger"
                    className="justify-start px-4 py-2 data-[state=active]:bg-secondary data-[state=active]:text-foreground text-red-600 dark:text-red-400"
                >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Danger Zone
                </TabsTrigger>
            </TabsList>
        </aside>
    );
}
