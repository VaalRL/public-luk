"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withErrorHandling, type ActionResult } from "@/lib/action-wrapper";

/**
 * 危險操作區
 *
 * 每個操作都會刪除大量資料，因此：
 * - 一律包在 $transaction 內，避免中途失敗留下半刪除的資料庫
 * - 一律透過 withErrorHandling，讓失敗會被記錄並回傳可讀的錯誤，而不是直接拋例外
 */

/**
 * Delete all invoices and related data
 */
export async function deleteAllInvoices(): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        await prisma.$transaction([
            prisma.reconciliationRecord.deleteMany({}),
            prisma.invoiceReminder.deleteMany({}),
            prisma.invoice.deleteMany({}),
        ]);

        revalidatePath("/invoicing");
        revalidatePath("/reconciliation");
    }, "deleteAllInvoices");
}

/**
 * Delete all bank transactions and statements
 */
export async function deleteAllTransactions(): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        await prisma.$transaction([
            prisma.reconciliationRecord.deleteMany({}),
            prisma.transaction.deleteMany({}),
            prisma.bankStatement.deleteMany({}),
        ]);

        revalidatePath("/reconciliation");
    }, "deleteAllTransactions");
}

/**
 * Delete all companies and related data
 */
export async function deleteAllCompanies(): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        await prisma.$transaction([
            prisma.reconciliationRecord.deleteMany({}),
            prisma.invoiceReminder.deleteMany({}),
            prisma.invoice.deleteMany({}),
            prisma.overpayment.deleteMany({}),
            prisma.bankAccount.deleteMany({}),
            prisma.company.deleteMany({}),
        ]);

        revalidatePath("/");
    }, "deleteAllCompanies");
}

/**
 * Delete ALL data from the database
 */
export async function deleteAllData(): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        // 依外鍵相依順序刪除
        await prisma.$transaction([
            prisma.reconciliationRecord.deleteMany({}),
            prisma.invoiceReminder.deleteMany({}),
            prisma.reconciliationSnapshot.deleteMany({}),
            prisma.transaction.deleteMany({}),
            prisma.bankStatement.deleteMany({}),
            prisma.invoice.deleteMany({}),
            prisma.invoiceItemTemplate.deleteMany({}),
            prisma.parserTemplate.deleteMany({}),
            prisma.overpayment.deleteMany({}),
            prisma.bankAccount.deleteMany({}),
            prisma.company.deleteMany({}),
        ]);

        revalidatePath("/");
    }, "deleteAllData");
}
