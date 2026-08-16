import { getReconciliationSnapshot, getAllSnapshots } from "@/app/actions/snapshot";
import type { SnapshotTransaction, SnapshotInvoice } from "@/app/actions/snapshot";
import { ReconciliationInterface } from "@/components/reconciliation-interface";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SnapshotPage({
    params,
}: {
    params: Promise<{ month: string }>;
}) {
    const { month } = await params;
    const [snapshot, allSnapshots] = await Promise.all([
        getReconciliationSnapshot(month),
        getAllSnapshots(),
    ]);

    if (!snapshot) {
        notFound();
    }

    // Sort snapshots by month descending (newest first)
    const sortedSnapshots = allSnapshots.sort((a, b) => b.month.localeCompare(a.month));
    const currentIndex = sortedSnapshots.findIndex(s => s.month === month);

    // "Next" in list is older (since desc sort), "Prev" in list is newer
    // But logically "Next Month" means newer date.
    // So "Next Month" -> index - 1 (if index > 0)
    // "Prev Month" -> index + 1 (if index < length - 1)
    const nextMonthSnapshot = currentIndex > 0 ? sortedSnapshots[currentIndex - 1] : null;
    const prevMonthSnapshot = currentIndex < sortedSnapshots.length - 1 ? sortedSnapshots[currentIndex + 1] : null;

    // Convert string dates back to Date objects
    const transactions = snapshot.transactions.map((tx: SnapshotTransaction) => ({
        ...tx,
        date: new Date(tx.date),
    }));

    const invoices = snapshot.invoices.map((inv: SnapshotInvoice) => ({
        ...inv,
        date: new Date(inv.date),
    }));

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            返回概覽
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {month} 對帳記錄
                        </h1>
                        <p className="text-muted-foreground">
                            檢視歷史銷帳記錄（唯讀模式）
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={!prevMonthSnapshot} asChild={!!prevMonthSnapshot}>
                        {prevMonthSnapshot ? (
                            <Link href={`/reconciliation/${prevMonthSnapshot.month}`}>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                {prevMonthSnapshot.month}
                            </Link>
                        ) : (
                            <span>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                上個月
                            </span>
                        )}
                    </Button>
                    <Button variant="outline" size="sm" disabled={!nextMonthSnapshot} asChild={!!nextMonthSnapshot}>
                        {nextMonthSnapshot ? (
                            <Link href={`/reconciliation/${nextMonthSnapshot.month}`}>
                                {nextMonthSnapshot.month}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Link>
                        ) : (
                            <span>
                                下個月
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                ⚠️ 您正在檢視歷史對帳記錄。在此頁面的操作（如編輯、銷帳）將會更新實際資料庫，並在儲存時覆蓋此對帳記錄。
            </div>

            <ReconciliationInterface
                transactions={transactions}
                invoices={invoices}
            />
        </div>
    );
}
