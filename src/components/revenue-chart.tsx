"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useT } from "@/lib/i18n/context";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

type MonthlyData = {
    month: string;
    monthLabel: string;
    billed: number;
    collected: number;
};

export function RevenueChart({ data }: { data: MonthlyData[] }) {
    const t = useT();

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
                    <BarChart data={data}>
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
