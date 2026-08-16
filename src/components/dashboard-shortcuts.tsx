"use client";

import Link from "next/link";
import { FileText, GitCompareArrows, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {} from "@/components/ui/button";

export function DashboardShortcuts() {
    const shortcuts = [
        {
            title: "立帳管理",
            description: "建立帳單",
            icon: FileText,
            href: "/invoicing",
            color: "text-green-600",
            bgColor: "bg-green-50",
            hoverColor: "hover:bg-green-50/50",
        },
        {
            title: "銷帳作業",
            description: "上傳銀行明細並自動銷帳",
            icon: GitCompareArrows,
            href: "/reconciliation",
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            hoverColor: "hover:bg-purple-50/50",
        },
        {
            title: "系統設定",
            description: "管理客戶公司與帳號資料",
            icon: Settings,
            href: "/settings",
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            hoverColor: "hover:bg-amber-50/50",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                    <Link key={shortcut.href} href={shortcut.href}>
                        <Card className={`hover:shadow-md transition-all duration-200 cursor-pointer h-full border-l-4 ${shortcut.hoverColor}`} style={{ borderLeftColor: shortcut.color.replace('text-', '').replace('-600', '') }}>
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className={`p-2 rounded-lg ${shortcut.bgColor}`}>
                                    <Icon className={`w-6 h-6 ${shortcut.color}`} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{shortcut.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{shortcut.description}</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}
