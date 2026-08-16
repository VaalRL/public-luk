"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { withErrorHandling, type ActionResult } from "@/lib/action-wrapper";
import { syncInvoiceBalance } from "@/lib/invoice-balance";

export async function getInvoices() {
    return await prisma.invoice.findMany({
        include: {
            company: {
                include: {
                    bankAccounts: true,
                },
            },
            provider: {
                include: {
                    bankAccounts: true,
                },
            },
            reconciliations: true,
            reminders: {
                orderBy: { date: 'asc' }
            },
        },
        orderBy: { date: "desc" },
    });
}

export async function getInvoiceById(id: string) {
    return await prisma.invoice.findUnique({
        where: { id },
        include: {
            company: true,
            provider: true,
            reconciliations: {
                include: {
                    transaction: true,
                },
            },
            reminders: {
                orderBy: { date: 'asc' }
            },
        },
    });
}

import { withValidation } from "@/lib/action-wrapper";
import { createInvoiceSchema } from "@/lib/validations/invoice";
import { Prisma, Invoice } from "@prisma/client";

export async function createInvoice(rawData: unknown): Promise<ActionResult<Invoice>> {
    return withValidation(
        async (data) => {
            const totalAmount = Math.round(data.amount + data.taxAmount);

            let invoiceNumber = data.invoiceNumber;

            if (!invoiceNumber) {
                // Fetch company and provider in parallel
                const [company, provider] = await Promise.all([
                    prisma.company.findUnique({
                        where: { id: data.companyId },
                        select: { id: true, name: true } // Select only needed fields
                    }),
                    data.providerId
                        ? prisma.company.findUnique({
                            where: { id: data.providerId },
                            select: { id: true, name: true, shortName: true } // Select only needed fields
                        })
                        : Promise.resolve(null)
                ]);

                if (company) {
                    // Get provider info for short name
                    let shortName = "XX";
                    if (provider) {
                        shortName = provider.shortName || provider.name.substring(0, 2).toUpperCase();
                    }

                    const dateStr = format(data.date, "yyyyMMdd");
                    const prefix = `${shortName}${dateStr}`;

                    const lastInvoice = await prisma.invoice.findFirst({
                        where: {
                            companyId: data.companyId,
                            invoiceNumber: {
                                startsWith: prefix
                            }
                        },
                        orderBy: {
                            invoiceNumber: 'desc'
                        }
                    });

                    let sequence = 1;
                    if (lastInvoice?.invoiceNumber) {
                        // Extract number from "PREFIX#01" -> 1
                        const parts = lastInvoice.invoiceNumber.split('#');
                        if (parts.length === 2) {
                            const currentSeq = parseInt(parts[1]);
                            if (!isNaN(currentSeq)) {
                                sequence = currentSeq + 1;
                            }
                        }
                    }

                    invoiceNumber = `${prefix}#${sequence.toString().padStart(2, '0')}`;
                }
            }

            const invoice = await prisma.invoice.create({
                data: {
                    companyId: data.companyId,
                    providerId: data.providerId,
                    date: data.date,
                    amount: data.amount,
                    taxAmount: data.taxAmount,
                    totalAmount,
                    items: JSON.stringify(data.items),
                    invoiceNumber: invoiceNumber,
                    title: data.title || "報價單",
                    issueInvoice: data.issueInvoice ?? true,
                    status: "unpaid",
                    paidAmount: 0,
                    bankAccountId: data.bankAccountId,
                    reminders: {
                        create: data.reminders?.map(r => ({ date: r.date, text: r.text })) || []
                    }
                },
                include: {
                    company: true,
                    provider: true,
                    reminders: true,
                },
            });

            revalidatePath("/invoicing");
            return invoice;
        },
        "createInvoice",
        createInvoiceSchema,
        rawData
    );
}

import { updateInvoiceSchema } from "@/lib/validations/invoice";

export async function updateInvoice(
    id: string,
    rawData: unknown
): Promise<ActionResult<Invoice>> {
    return withValidation(
        async (data) => {
            // items 需要序列化成字串、reminders 由另外的流程處理，
            // 因此先把兩者從展開的欄位中排除，避免型別與實際寫入不一致。
            // paidAmount 不在 updateInvoiceSchema 內，無法經由這個函式更新 ——
            // 付款一律走 reconciliation 或 recordManualPayment。
            const { items, reminders: _reminders, ...rest } = data;
            const updateData: Prisma.InvoiceUncheckedUpdateInput = { ...rest };

            if (data.amount !== undefined && data.taxAmount !== undefined) {
                updateData.totalAmount = Math.round(data.amount + data.taxAmount);
            }

            if (items) {
                updateData.items = JSON.stringify(items);
            }

            const invoice = await prisma.invoice.update({
                where: { id },
                data: updateData,
            });

            revalidatePath("/invoicing");
            return invoice;
        },
        "updateInvoice",
        updateInvoiceSchema,
        rawData
    );
}

import { recordManualPaymentSchema } from "@/lib/validations/invoice";
import { ReconciliationRecord } from "@prisma/client";

export async function recordManualPayment(
    rawData: unknown
): Promise<ActionResult<ReconciliationRecord>> {
    return withValidation(
        async (data) => {
            const { invoiceId, amount, date, note } = data;

            // 整筆記帳必須是原子的：交易、銷帳記錄、發票餘額三者不允許只成功一部分
            const reconciliation = await prisma.$transaction(async (tx) => {
                // 手動付款沒有對應的銀行對帳單，bankStatementId 保持 null
                const transaction = await tx.transaction.create({
                    data: {
                        date,
                        description: note || "手動記錄付款",
                        deposit: amount,
                        note: note || "手動記錄",
                        status: "matched",
                    },
                });

                const created = await tx.reconciliationRecord.create({
                    data: {
                        invoiceId,
                        transactionId: transaction.id,
                        amount,
                        date,
                    },
                });

                // 已付金額一律由 syncInvoiceBalance 依銷帳記錄重算，
                // 不在這裡自行累加 —— 那正是先前灌水一倍的原因。
                await syncInvoiceBalance(tx, invoiceId);

                return created;
            });

            revalidatePath("/invoicing");
            revalidatePath("/reconciliation");
            return reconciliation;
        },
        "recordManualPayment",
        recordManualPaymentSchema,
        rawData
    );
}

export async function deleteInvoice(id: string): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        // 三段刪除必須是原子的，中途失敗會留下沒有帳單的銷帳記錄／提醒
        await prisma.$transaction([
            prisma.reconciliationRecord.deleteMany({ where: { invoiceId: id } }),
            prisma.invoiceReminder.deleteMany({ where: { invoiceId: id } }),
            prisma.invoice.delete({ where: { id } }),
        ]);

        revalidatePath("/invoicing");
    }, "deleteInvoice");
}

export async function addInvoiceReminder(invoiceId: string, date: Date) {
    const reminder = await prisma.invoiceReminder.create({
        data: {
            invoiceId,
            date,
        },
    });
    revalidatePath("/invoicing");
    revalidatePath("/reconciliation");
    revalidatePath("/");
    return reminder;
}

export async function deleteInvoiceReminder(id: string) {
    await prisma.invoiceReminder.delete({
        where: { id },
    });
    revalidatePath("/invoicing");
    revalidatePath("/reconciliation");
    revalidatePath("/");
}

export async function createStandaloneReminder(
    date: Date,
    title: string | null,
    description: string | null
) {
    const reminder = await prisma.invoiceReminder.create({
        data: {
            date,
            title: title || null,
            description: description || null,
            // invoiceId is optional, so we can omit it for standalone reminders
        },
    });
    // 不調用 revalidatePath，讓客戶端使用 router.refresh() 控制刷新時機
    return reminder;
}

export async function toggleReminderStatus(id: string, completed: boolean) {
    await prisma.invoiceReminder.update({
        where: { id },
        data: { completed },
    });
    revalidatePath("/", "page");
}

export async function getNextInvoiceNumber(companyId: string, providerId: string, date: Date) {
    const provider = await prisma.company.findUnique({
        where: { id: providerId },
    });

    if (!provider) return "";

    const shortName = provider.shortName || provider.name.substring(0, 2).toUpperCase();
    const dateStr = format(date, "yyyyMMdd");
    const prefix = `${shortName}${dateStr}`;

    const lastInvoice = await prisma.invoice.findFirst({
        where: {
            companyId,
            invoiceNumber: {
                startsWith: prefix
            }
        },
        orderBy: {
            invoiceNumber: 'desc'
        }
    });

    let sequence = 1;
    if (lastInvoice?.invoiceNumber) {
        // Extract number from "PREFIX#01" -> 1
        const parts = lastInvoice.invoiceNumber.split('#');
        if (parts.length === 2) {
            const currentSeq = parseInt(parts[1]);
            if (!isNaN(currentSeq)) {
                sequence = currentSeq + 1;
            }
        }
    }

    return `${prefix}#${sequence.toString().padStart(2, '0')}`;
}
