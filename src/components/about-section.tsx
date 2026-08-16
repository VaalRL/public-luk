"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Coffee } from "lucide-react";
import Image from "next/image";

export function AboutSection() {
    const [appVersion, _setAppVersion] = React.useState<string>("a0.0.3");
    const [releaseNotes, setReleaseNotes] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Try to get version from Electron
        if (typeof window !== 'undefined' && window.electron?.versions) {
            // Note: In a real app, you might expose the app version specifically
            // For now we keep the semantic version manually or fetch if exposed
        }

        // Check for updates to show release notes (mock or real)
        const checkUpdate = async () => {
            if (window.electron?.checkForUpdates) {
                try {
                    const status = await window.electron.checkForUpdates();
                    if (status.releaseNotes) {
                        // If it's an array of release notes, join them, or just use string
                        const notes = Array.isArray(status.releaseNotes)
                            ? status.releaseNotes.map((n) => (n as { releaseName?: string; version?: string }).releaseName || (n as { version?: string }).version).join('\n')
                            : status.releaseNotes;
                        setReleaseNotes(notes);
                    }
                } catch (e) {
                    console.error("Failed to check updates for notes", e);
                }
            }
        };

        checkUpdate();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    關於專案
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Luk</h3>
                    <p className="text-muted-foreground leading-relaxed">
                        這是一個專為小公司設計的簡易帳單產出/銀行對帳工具。它能夠自動解析銀行明細，並將其與系統中的帳單進行半自動對照，大幅減少人工核對的時間與錯誤。
                        系統同時提供了完整的客戶管理、PDF檔案生成與追蹤功能，讓財務管理變得更加輕鬆高效。
                    </p>
                </div>

                {/* Release Notes Section */}
                <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        更新日誌 (Release Notes)
                    </h3>
                    <div className="bg-muted/30 rounded-lg p-4 max-h-60 overflow-y-auto text-sm border">
                        {releaseNotes ? (
                            <div className="whitespace-pre-wrap">{typeof releaseNotes === 'string' ? releaseNotes : JSON.stringify(releaseNotes)}</div>
                        ) : (
                            <div className="space-y-3">
                                <div className="border-b pb-2 last:border-0 last:pb-0">
                                    <p className="font-semibold text-primary">v0.1.0 (Current)</p>
                                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                                        <li>Initial Release with core features:</li>
                                        <li className="ml-4">Bank statement parsing (Fubon/CTBC)</li>
                                        <li className="ml-4">Invoice generation and management</li>
                                        <li className="ml-4">Automated reconciliation</li>
                                        <li className="ml-4">Electron desktop app packaging</li>
                                    </ul>
                                </div>
                                <div className="border-b pb-2 last:border-0 last:pb-0">
                                    <p className="font-semibold text-muted-foreground">v0.0.x</p>
                                    <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                                        <li>Beta testing and bug fixes</li>
                                        <li>UI/UX improvements</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Coffee className="w-5 h-5 text-amber-600" />
                        支持開發者
                    </h3>
                    <p className="text-muted-foreground mb-6">
                        如果您覺得這個工具對您有幫助，歡迎請我喝杯咖啡，這將支持我持續維護並開發更多實用的功能！
                    </p>

                    <a
                        href="https://buymeacoffee.com/whoami885"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block transition-transform hover:scale-105"
                    >
                        <Image
                            src="/bmc-button.png"
                            alt="Buy Me A Coffee"
                            height={60}
                            width={217}
                            className="rounded-lg shadow-sm"
                            unoptimized
                        />
                    </a>
                </div>

                <div className="pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-3">聯絡作者</h3>
                    <p className="text-muted-foreground">
                        如有任何問題或建議，歡迎透過電子郵件聯繫：
                    </p>
                    <a
                        href="mailto:ch.lien@proton.me"
                        className="inline-flex items-center gap-2 mt-2 text-primary hover:underline"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        ch.lien@proton.me
                    </a>
                </div>

                <div className="pt-6 border-t text-sm text-muted-foreground">
                    <p>版本：{appVersion}</p>
                    <p>© 2025 All Rights Reserved.</p>
                </div>
            </CardContent>
        </Card>
    );
}
