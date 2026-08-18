"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormat, useT } from "@/lib/i18n/context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

type MonthlyData = {
    /** "yyyy-MM" */
    month: string;
    billed: number;
    collected: number;
};

export function RevenueChart({ data }: { data: MonthlyData[] }) {
    const t = useT();
    const fmt = useFormat();

    // 月份標籤在這裡才依語言產生。原本是伺服器端寫死 "MM月"，
    // 切成英文之後 X 軸仍是「03月」。
    const chartData = React.useMemo(
        () => data.map((d) => {
            const [year, month] = d.month.split("-").map(Number);
            // 用 "yyyy-MM" 直接 new Date() 會被當成 UTC 午夜，
            // 在負時區會顯示成上個月，所以明確指定年月日
            const label = Number.isFinite(year) && Number.isFinite(month)
                ? fmt.date(new Date(year, month - 1, 1), { month: "short" })
                : d.month;
            return { ...d, monthLabel: label };
        }),
        [data, fmt]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    {t("dashboard.revenue.title")}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                            dataKey="monthLabel"
                            className="text-sm"
                        />
                        <YAxis
                            className="text-sm"
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip
                            formatter={(value: number) => `$${value.toLocaleString()}`}
                            contentStyle={{
                                backgroundColor: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                            }}
                        />
                        <Legend />
                        <Bar
                            dataKey="billed"
                            name={t("dashboard.revenue.billed")}
                            fill="hsl(var(--primary))"
                            radius={[8, 8, 0, 0]}
                        />
                        <Bar
                            dataKey="collected"
                            name={t("dashboard.revenue.collected")}
                            fill="hsl(142, 76%, 36%)"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
