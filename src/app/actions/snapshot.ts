"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { Transaction as StoreTransaction } from "@/stores/reconciliation-store";
import type { Invoice as StoreInvoice } from "@/stores/invoice-store";

/**
 * 對帳快照的內容。
 *
 * 快照以 JSON 儲存，日期序列化後是字串，讀取端必須自行轉回 Date；
 * 除了日期以外，形狀與畫面上使用的 Transaction / Invoice 相同。
 */
export type SnapshotTransaction = Omit<StoreTransaction, 'date'> & { date: string };
export type SnapshotInvoice = Omit<StoreInvoice, 'date'> & { date: string };

export interface ReconciliationSnapshotData {
    month?: string;
    transactions: SnapshotTransaction[];
    invoices: SnapshotInvoice[];
}

export async function saveReconciliationSnapshot(month: string) {
    // month format: YYYY-MM
    // Note: We save ALL currently visible transactions in the reconciliation interface,
    // not just those from the target month, because users may be reconciling
    // transactions from multiple months at once.

    // Get all unmatched and matched transactions with deposits (what shows in reconciliation)
    const transactions = await prisma.transaction.findMany({
        where: {
            deposit: { gt: 0 },
            closedMonth: null, // 只結算尚未結帳的交易
        },
        include: {
            bankStatement: true,
            reconciliations: {
                include: {
                    invoice: {
                        include: {
                            company: true,
                        },
                    },
                },
            },
        },
        orderBy: { date: "desc" },
    });

    // Identify invoices linked to these transactions
    const linkedInvoiceIds = new Set<string>();
    transactions.forEach(tx => {
        tx.reconciliations.forEach(rec => linkedInvoiceIds.add(rec.invoiceId));
    });

    // Get all currently open invoices (unpaid or partial)
    const openInvoices = await prisma.invoice.findMany({
        where: {
            OR: [
                { status: "unpaid" },
                { status: "partial" },
            ],
        },
        select: { id: true },
    });
    openInvoices.forEach(inv => linkedInvoiceIds.add(inv.id));

    // Fetch full invoice objects for the combined set
    const invoices = await prisma.invoice.findMany({
        where: {
            id: { in: Array.from(linkedInvoiceIds) },
        },
        include: {
            company: {
                include: {
                    bankAccounts: true,
                },
            },
            reconciliations: true,
        },
        orderBy: { date: "asc" },
    });

    const snapshotData = {
        month,
        transactions,
        invoices,
        createdAt: new Date().toISOString(),
    };

    // Save or update snapshot
    await prisma.reconciliationSnapshot.upsert({
        where: { month },
        create: {
            month,
            data: JSON.stringify(snapshotData),
        },
        update: {
            data: JSON.stringify(snapshotData),
        },
    });

    // 結帳：把這次結算的交易與對帳單標記為已結期別，**不刪除任何資料**。
    //
    // 先前的實作會刪掉所有 BankStatement / Transaction / ReconciliationRecord，
    // 但保留 Invoice.paidAmount —— 結果是每次月結都製造一批「有金額、沒憑證」
    // 的發票，稽核時無從追溯，且會與 recalculateAllPaidAmounts 互相矛盾
    // （該工具依銷帳記錄重算，會把已收款歸零）。
    //
    // 改為標記後，已結帳的交易不再出現在對帳工作區，但憑證完整保留。
    const closedAt = new Date();

    await prisma.$transaction([
        prisma.transaction.updateMany({
            where: { closedMonth: null, deposit: { gt: 0 } },
            data: { closedMonth: month, closedAt },
        }),
        prisma.bankStatement.updateMany({
            where: { closedMonth: null },
            data: { closedMonth: month, closedAt },
        }),
    ]);

    revalidatePath("/reconciliation");
    revalidatePath("/");
}

export async function getReconciliationSnapshot(month: string): Promise<ReconciliationSnapshotData | null> {
    const snapshot = await prisma.reconciliationSnapshot.findUnique({
        where: { month },
    });

    if (!snapshot) {
        return null;
    }

    return JSON.parse(snapshot.data) as ReconciliationSnapshotData;
}

export async function getAllSnapshots() {
    const snapshots = await prisma.reconciliationSnapshot.findMany({
        orderBy: { month: "desc" },
    });

    return snapshots.map(s => ({
        id: s.id,
        month: s.month,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
    }));
}
