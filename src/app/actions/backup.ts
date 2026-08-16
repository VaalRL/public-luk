"use server";

import { prisma } from "@/lib/prisma";
import type {
    BankAccount,
    BankStatement,
    Company,
    Invoice,
    InvoiceItemTemplate,
    NotificationTemplate,
    ParserTemplate,
    ReconciliationRecord,
    Transaction,
} from "@prisma/client";

/**
 * 備份檔的資料結構。
 *
 * exportData() 直接輸出 Prisma 模型，所以還原時的形狀就是這些模型。
 * 各區段都是可選的 —— 舊版備份檔可能沒有較新的區段。
 *
 * 注意：JSON 會把 Date 序列化成字串，實際還原時傳給 Prisma 的是字串。
 * Prisma 接受字串形式的日期，但型別上仍宣告為模型型別以表達意圖。
 */
export interface BackupData {
    version?: string;
    companies?: (Company & { bankAccounts?: BankAccount[] })[];
    parserTemplates?: ParserTemplate[];
    invoiceItemTemplates?: InvoiceItemTemplate[];
    notificationTemplates?: NotificationTemplate[];
    invoices?: Invoice[];
    bankStatements?: (BankStatement & { transactions?: Transaction[] })[];
    reconciliationRecords?: ReconciliationRecord[];
}

export async function exportData() {
    const companies = await prisma.company.findMany({
        include: {
            bankAccounts: true,
        },
    });

    const parserTemplates = await prisma.parserTemplate.findMany();
    const invoiceItemTemplates = await prisma.invoiceItemTemplate.findMany();

    const invoices = await prisma.invoice.findMany();

    const bankStatements = await prisma.bankStatement.findMany({
        include: {
            transactions: true,
        },
    });

    const reconciliationRecords = await prisma.reconciliationRecord.findMany();
    const notificationTemplates = await prisma.notificationTemplate.findMany();

    return {
        companies,
        parserTemplates,
        invoiceItemTemplates,
        notificationTemplates,
        invoices,
        bankStatements,
        reconciliationRecords,
        timestamp: new Date().toISOString(),
        version: "1.0",
    };
}

export async function importData(data: BackupData) {
    // Validate data structure
    if (!data.version || !data.companies) {
        throw new Error("Invalid data format");
    }

    // Use a transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
        // 1. Clear existing data (optional, or we could upsert)
        // For simplicity in this backup/restore feature, we'll clear and replace
        // But we need to be careful about foreign key constraints

        await tx.reconciliationRecord.deleteMany();
        await tx.transaction.deleteMany();
        await tx.bankStatement.deleteMany();
        await tx.invoice.deleteMany();
        await tx.bankAccount.deleteMany();
        await tx.company.deleteMany();
        await tx.parserTemplate.deleteMany();
        await tx.invoiceItemTemplate.deleteMany();
        await tx.notificationTemplate.deleteMany();

        // 2. Restore Companies and Bank Accounts
        for (const company of data.companies ?? []) {
            const { bankAccounts, ...companyData } = company;
            await tx.company.create({
                data: {
                    ...companyData,
                    bankAccounts: {
                        create: (bankAccounts ?? []).map((acc) => ({
                            id: acc.id,
                            accountNumber: acc.accountNumber || acc.last5Digits || "UNKNOWN", // Fallback for missing accountNumber
                            last5Digits: acc.last5Digits,
                            note: acc.note,
                            createdAt: acc.createdAt,
                            updatedAt: acc.updatedAt,
                        })),
                    },
                },
            });
        }

        // 3. Restore Parser Templates
        if (data.parserTemplates) {
            for (const template of data.parserTemplates) {
                await tx.parserTemplate.create({
                    data: template,
                });
            }
        }

        // 4. Restore Invoice Item Templates
        if (data.invoiceItemTemplates) {
            for (const template of data.invoiceItemTemplates) {
                await tx.invoiceItemTemplate.create({
                    data: template,
                });
            }
        }

        // Restore Notification Templates
        if (data.notificationTemplates) {
            for (const template of data.notificationTemplates) {
                await tx.notificationTemplate.create({
                    data: template,
                });
            }
        }

        // 5. Restore Invoices
        if (data.invoices) {
            for (const invoice of data.invoices) {
                await tx.invoice.create({
                    data: invoice,
                });
            }
        }

        // 6. Restore Bank Statements and Transactions
        if (data.bankStatements) {
            for (const stmt of data.bankStatements) {
                const { transactions, ...stmtData } = stmt;
                await tx.bankStatement.create({
                    data: {
                        ...stmtData,
                        transactions: {
                            create: (transactions ?? []).map((tx) => ({
                                ...tx,
                                bankStatementId: undefined, // Let Prisma handle the relation
                            })),
                        },
                    },
                });
            }
        }

        // 7. Restore Reconciliation Records
        if (data.reconciliationRecords) {
            for (const record of data.reconciliationRecords) {
                await tx.reconciliationRecord.create({
                    data: record,
                });
            }
        }
    });

    return { success: true };
}
