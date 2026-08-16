"use server";

import { prisma } from "@/lib/prisma";
import { syncInvoiceBalance, AMOUNT_EPSILON } from "@/lib/invoice-balance";

/**
 * 修復資料不一致：為「有已付金額、卻沒有對應銷帳記錄」的發票補上調整分錄。
 *
 * 注意：月結流程改為標記期別、不再刪除銷帳記錄之後，正常運作下不應該再出現
 * 這種落差。若這支工具仍找到大量待修項目，代表資料是在舊版月結（會刪除憑證）
 * 期間產生的，或有其他寫入路徑繞過了 syncInvoiceBalance。
 */
export async function fixPaidAmountDiscrepancies() {
    const allInvoices = await prisma.invoice.findMany({
        where: {
            paidAmount: {
                gt: 0,
            },
        },
        include: {
            reconciliations: true,
        },
    });

    const fixes = [];
    // 失敗不再被靜默吞掉——之前每一筆都因外鍵違反而失敗，卻仍回報「修復 0 筆」，
    // 讓人以為資料本來就沒問題。
    const failures: { invoiceId: string; invoiceNumber: string | null; reason: string }[] = [];

    for (const invoice of allInvoices) {
        const reconciledAmount = invoice.reconciliations.reduce(
            (sum, r) => sum + r.amount,
            0
        );
        const discrepancy = invoice.paidAmount - reconciledAmount;

        if (Math.abs(discrepancy) > 0.01) {
            // There's a discrepancy - create a manual reconciliation record
            try {
                const reconciliation = await prisma.$transaction(async (tx) => {
                    // 修復用的調整分錄沒有對應的銀行對帳單，bankStatementId 保持 null
                    const transaction = await tx.transaction.create({
                        data: {
                            date: invoice.date,
                            description: `數據修復：補錄付款記錄`,
                            deposit: discrepancy,
                            note: `自動修復：原 paidAmount=${invoice.paidAmount}, 銷帳記錄總額=${reconciledAmount}`,
                            status: "matched",
                        },
                    });

                    return await tx.reconciliationRecord.create({
                        data: {
                            invoiceId: invoice.id,
                            transactionId: transaction.id,
                            amount: discrepancy,
                            date: invoice.date,
                        },
                    });
                });

                fixes.push({
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    discrepancy,
                    reconciliationId: reconciliation.id,
                });
            } catch (error) {
                console.error(`Failed to fix invoice ${invoice.id}:`, error);
                failures.push({
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    reason: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    return {
        totalFixed: fixes.length,
        fixes,
        totalFailed: failures.length,
        failures,
    };
}

/**
 * Recalculate all invoice paidAmount based on reconciliation records
 * This ensures data consistency
 */
export async function recalculateAllPaidAmounts() {
    const allInvoices = await prisma.invoice.findMany({
        include: {
            reconciliations: true,
        },
    });

    const updates = [];

    for (const invoice of allInvoices) {
        const correctPaidAmount = invoice.reconciliations.reduce(
            (sum, r) => sum + r.amount,
            0
        );

        if (Math.abs(invoice.paidAmount - correctPaidAmount) > AMOUNT_EPSILON) {
            // 一律走 syncInvoiceBalance，與其他寫入路徑使用同一套計算與狀態判斷
            const synced = await syncInvoiceBalance(prisma, invoice.id);
            if (!synced) continue;

            updates.push({
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                oldPaidAmount: invoice.paidAmount,
                newPaidAmount: synced.paidAmount,
                oldStatus: invoice.status,
                newStatus: synced.status,
            });
        }
    }

    return {
        totalUpdated: updates.length,
        updates,
    };
}
