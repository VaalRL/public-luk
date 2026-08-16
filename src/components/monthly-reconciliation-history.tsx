"use client";

import { useState, useEffect } from "react";
import { format, subMonths, addMonths, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, FileText, ArrowRightLeft, Archive } from "lucide-react";
import { getReconciliationsByMonth } from "@/app/actions/dashboard";
import { getAllSnapshots } from "@/app/actions/snapshot";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Define the type based on the return type of getReconciliationsByMonth
// Since we can't easily import the inferred type, we'll define a compatible interface
interface ReconciliationRecord {
    id: string;
    amount: number;
    date: Date;
    invoice: {
        invoiceNumber: string | null;
        company: {
            name: string;
        };
    };
    transaction: {
        description: string | null;
        note: string | null;
    } | null;
    overpayment?: {
        description: string | null;
    } | null;
}

export function MonthlyReconciliationHistory() {
    const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));
    const [records, setRecords] = useState<ReconciliationRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [snapshots, setSnapshots] = useState<string[]>([]);

    useEffect(() => {
        const fetchSnapshots = async () => {
            try {
                const allSnapshots = await getAllSnapshots();
                setSnapshots(allSnapshots.map((s: { month: string }) => s.month));
            } catch (error) {
                console.error("Failed to fetch snapshots:", error);
            }
        };
        fetchSnapshots();
    }, []);

    useEffect(() => {
        const fetchRecords = async () => {
            setLoading(true);
            try {
                const monthStr = format(currentMonth, "yyyy-MM");
                const data = await getReconciliationsByMonth(monthStr);
                setRecords(data);
            } catch (error) {
                console.error("Failed to fetch reconciliations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, [currentMonth]);

    const handlePrevMonth = () => {
        setCurrentMonth((prev) => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth((prev) => addMonths(prev, 1));
    };

    const totalAmount = Math.round(records.reduce((sum, record) => sum + record.amount, 0));
    const currentMonthStr = format(currentMonth, "yyyy-MM");
    const hasSnapshot = snapshots.includes(currentMonthStr);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    歷史銷帳記錄 (History)
                </CardTitle>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[100px] text-center font-medium">
                        {format(currentMonth, "yyyy年 MM月")}
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleNextMonth}
                        disabled={currentMonth >= startOfMonth(new Date())}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4 flex justify-between items-center">
                    <div>
                        {hasSnapshot && (
                            <Link href={`/reconciliation/${currentMonthStr}`}>
                                <Button variant="outline" size="sm" className="gap-2 text-amber-700 border-amber-200 hover:bg-amber-50">
                                    <Archive className="w-4 h-4" />
                                    檢視此月份對帳記錄
                                </Button>
                            </Link>
                        )}
                    </div>
                    <Badge variant="secondary" className="text-sm">
                        本月銷帳總額: ${totalAmount.toLocaleString()}
                    </Badge>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>日期</TableHead>
                                <TableHead>公司名稱</TableHead>
                                <TableHead>帳單號碼</TableHead>
                                <TableHead>交易備註</TableHead>
                                <TableHead className="text-right">銷帳金額</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        載入中...
                                    </TableCell>
                                </TableRow>
                            ) : records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        本月尚無銷帳記錄
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>
                                            {format(new Date(record.date), "yyyy/MM/dd")}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {record.invoice.company.name}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <FileText className="h-3 w-3 text-muted-foreground" />
                                                {record.invoice.invoiceNumber || "N/A"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {record.transaction?.note || record.transaction?.description || record.overpayment?.description || "-"}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-green-600">
                                            ${record.amount.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
