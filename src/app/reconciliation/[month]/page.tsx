import { getReconciliationSnapshot, getAllSnapshots } from "@/app/actions/snapshot";
import type { SnapshotTransaction, SnapshotInvoice } from "@/app/actions/snapshot";
import { ReconciliationInterface } from "@/components/reconciliation-interface";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { notFound } from "next/navigation";

export default async function SnapshotPage({
    params,
}: {
    params: Promise<{ month: string }>;
}) {
    const t = await getT();
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
                            {t("monthHistory.back")}
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {t("monthHistory.title", { month })}
                        </h1>
                        <p className="text-muted-foreground">
                            {t("monthHistory.subtitle")}
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
                                {t("monthHistory.prevMonth")}
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
                                {t("monthHistory.nextMonth")}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </span>
                        )}
                    </Button>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                {t("monthHistory.warning")}
            </div>

            <ReconciliationInterface
                transactions={transactions}
                invoices={invoices}
            />
        </div>
    );
}
