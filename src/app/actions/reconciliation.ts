"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withErrorHandling, withValidation, type ActionResult } from "@/lib/action-wrapper";
import { createReconciliationSchema, updateTransactionSchema, autoMatchSchema } from "@/lib/validations/reconciliation";
import { Prisma, Transaction, ReconciliationRecord } from "@prisma/client";
import { extractLast5Digits, findBestAccountMatch } from "@/lib/fuzzy-match";
import { resolveAccountOwners, accountsOwnedBy } from "@/lib/account-resolution";
import { syncInvoiceBalances, syncInvoiceBalance } from "@/lib/invoice-balance";
import { getT } from "@/lib/i18n/server";

/** 帶有銀行帳號的公司資料（自動對帳的歸戶需要） */
type CompanyWithAccounts = Prisma.CompanyGetPayload<{ include: { bankAccounts: true } }>;

/** 帶有公司資料的溢繳款 */
type OverpaymentWithCompany = Prisma.OverpaymentGetPayload<{ include: { company: true } }>;

/** 一次沖銷的結果 */
interface MatchResult {
    invoiceId: string;
    transactionId: string | null;
    overpaymentId: string | null;
    amount: number;
    type: 'transaction' | 'overpayment';
}

/** 自動對帳的整體結果 */
interface AutoMatchResult {
    results: {
        companyId: string;
        companyName: string;
        sourceAccounts: string[];
        totalDeposit: number;
        totalAR: number;
        remainingUnpaidAR: number;
        remainingSurplusDeposit: number;
        matchesCount: number;
        matches: MatchResult[];
    }[];
    unknownAccounts: { last5: string; totalDeposit: number; transactions: Transaction[] }[];
    unidentifiableTransactions: Transaction[];
    ambiguousTransactions: Transaction[];
}

/** 自動對帳期間交易已被其他作業處理 */
class ConcurrentMatchError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ConcurrentMatchError";
    }
}

export async function createBankStatement(filename: string, totalAmount?: number) {
    const statement = await prisma.bankStatement.create({
        data: {
            filename,
            totalAmount,
        },
    });
    return statement;
}

export async function createTransaction(data: {
    bankStatementId: string;
    date: Date;
    description?: string;
    withdrawal: number;
    deposit: number;
    balance?: number;
    note?: string;
}) {
    const transaction = await prisma.transaction.create({
        data,
    });
    return transaction;
}

export async function createTransactionsBatch(data: {
    bankStatementId: string;
    transactions: {
        date: Date;
        description?: string;
        withdrawal: number;
        deposit: number;
        balance?: number;
        note?: string;
    }[];
}) {
    const { bankStatementId, transactions } = data;

    // 1. Get historical context for anomaly detection
    // Large Amount: Get average of deposits
    const depositStats = await prisma.transaction.aggregate({
        where: { deposit: { gt: 0 } },
        _avg: { deposit: true },
    });
    const avgDeposit = depositStats._avg.deposit || 0;

    // Duplicates: Get transactions within the date range of the upload
    const minDate = transactions.reduce((min, t) => t.date < min ? t.date : min, new Date(8640000000000000));
    const maxDate = transactions.reduce((max, t) => t.date > max ? t.date : max, new Date(0));

    const checkStartDate = new Date(minDate); checkStartDate.setDate(checkStartDate.getDate() - 2);
    const checkEndDate = new Date(maxDate); checkEndDate.setDate(checkEndDate.getDate() + 2);

    const existingTransactions = await prisma.transaction.findMany({
        where: {
            date: { gte: checkStartDate, lte: checkEndDate }
        }
    });

    const transactionsToCreate = transactions.map((tx) => {
        const flags: string[] = [];
        let score = 0;

        // 1. Large Amount Detection
        if (tx.deposit > 0 && avgDeposit > 0 && tx.deposit > avgDeposit * 3) {
            flags.push("large_amount");
            score += 30;
        }

        // 2. Duplicate Detection
        const isDuplicate = existingTransactions.some(et =>
            et.deposit === tx.deposit &&
            et.withdrawal === tx.withdrawal &&
            Math.abs(et.date.getTime() - tx.date.getTime()) < 24 * 60 * 60 * 1000 && // Within 24 hours
            et.note === tx.note
        );

        if (isDuplicate) {
            flags.push("potential_duplicate");
            score += 50;
        }

        return {
            bankStatementId,
            date: tx.date,
            description: tx.description,
            withdrawal: tx.withdrawal,
            deposit: tx.deposit,
            balance: tx.balance,
            note: tx.note,
            status: "unmatched",
            anomalyFlags: JSON.stringify(flags),
            anomalyScore: Math.min(score, 100),
            reviewStatus: flags.length > 0 ? "pending" : "confirmed"
        };
    });

    const result = await prisma.transaction.createMany({
        data: transactionsToCreate,
    });

    return result;
}

export async function deleteBankStatement(id: string): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        // 三段刪除必須是原子的，中途失敗會留下孤兒交易或銷帳記錄
        await prisma.$transaction(async (tx) => {
            const transactions = await tx.transaction.findMany({
                where: { bankStatementId: id },
                select: { id: true }
            });

            const transactionIds = transactions.map(t => t.id);

            if (transactionIds.length > 0) {
                await tx.reconciliationRecord.deleteMany({
                    where: { transactionId: { in: transactionIds } }
                });
            }

            await tx.transaction.deleteMany({
                where: { bankStatementId: id },
            });

            await tx.bankStatement.delete({
                where: { id },
            });
        });

        revalidatePath("/reconciliation");
    }, "deleteBankStatement");
}

export async function updateTransaction(
    id: string,
    rawData: unknown
): Promise<ActionResult<Transaction>> {
    return withValidation(
        async (data) => {
            // Remove id from data as it is used in where clause
            const { id: _unusedId, ...updateData } = data;

            const transaction = await prisma.transaction.update({
                where: { id },
                data: updateData,
            });
            revalidatePath("/reconciliation");
            return transaction;
        },
        "updateTransaction",
        updateTransactionSchema,
        { id, ...(rawData as Record<string, unknown>) }
    );
}

export async function getUnmatchedTransactions() {
    return await prisma.transaction.findMany({
        where: {
            deposit: { gt: 0 },
            closedMonth: null, // 已結帳期別的交易不再出現在工作區
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
}

export async function getAllInvoices() {
    return await prisma.invoice.findMany({
        include: {
            company: {
                include: {
                    bankAccounts: true,
                },
            },
            reconciliations: true,
            reminders: true,
        },
        orderBy: { date: "asc" },
    });
}

export async function createReconciliation(rawData: unknown): Promise<ActionResult<ReconciliationRecord>> {
    return withValidation(
        async (data) => {
            const reconciliation = await prisma.reconciliationRecord.create({
                data,
            });

            // 已付金額一律由 syncInvoiceBalance 依銷帳記錄重算
            await syncInvoiceBalance(prisma, data.invoiceId);

            const invoice = await prisma.invoice.findUnique({ where: { id: data.invoiceId } });

            // Update transaction status and check for match anomalies
            const transaction = await prisma.transaction.findUnique({
                where: { id: data.transactionId }
            });

            if (transaction && invoice) {
                const flags = JSON.parse(transaction.anomalyFlags || "[]");
                let score = transaction.anomalyScore || 0;
                let hasNewAnomaly = false;

                // Check for delayed payment (> 90 days)
                const daysDiff = (transaction.date.getTime() - invoice.date.getTime()) / (1000 * 60 * 60 * 24);
                if (daysDiff > 90 && !flags.includes("delayed_payment")) {
                    flags.push("delayed_payment");
                    score += 20;
                    hasNewAnomaly = true;
                }

                // Check for amount mismatch (if 1-to-1 match attempted and amounts differ significantly)
                // This is a bit heuristic, assuming if we match the full transaction amount, it should match the invoice
                if (Math.abs(transaction.deposit - data.amount) < 0.01) { // Full transaction used
                    if (Math.abs(transaction.deposit - invoice.totalAmount) > invoice.totalAmount * 0.05 && !flags.includes("amount_mismatch")) {
                        flags.push("amount_mismatch");
                        score += 40;
                        hasNewAnomaly = true;
                    }
                }

                await prisma.transaction.update({
                    where: { id: data.transactionId },
                    data: {
                        status: "matched",
                        anomalyFlags: hasNewAnomaly ? JSON.stringify(flags) : undefined,
                        anomalyScore: hasNewAnomaly ? Math.min(score, 100) : undefined
                    },
                });
            } else {
                await prisma.transaction.update({
                    where: { id: data.transactionId },
                    data: { status: "matched" },
                });
            }

            revalidatePath("/reconciliation");
            return reconciliation;
        },
        "createReconciliation",
        createReconciliationSchema,
        rawData
    );
}

export async function autoMatchTransactions(rawData: unknown): Promise<ActionResult<AutoMatchResult>> {
    return withValidation(
        async ({ transactionIds }) => {
            // 錯誤訊息會直接進使用者的 toast，溢繳說明會寫進資料庫並顯示在列表上，
            // 兩者都要跟著介面語言走
            const t = await getT();
            // 1. Fetch all requested transactions
            const transactions = await prisma.transaction.findMany({
                where: {
                    id: { in: transactionIds },
                    status: "unmatched", // Prevent duplicate matching
                    closedMonth: null,   // 已結帳的交易不得再次沖銷
                },
            });

            // 1.1 Fetch all available overpayments
            const overpayments = await prisma.overpayment.findMany({
                where: { amount: { gt: 0 } },
                include: { company: true }
            });

            // 1.5 Fetch all known bank accounts to build candidate list
            const allBankAccounts = await prisma.bankAccount.findMany({
                select: { last5Digits: true }
            });
            const candidateAccounts = Array.from(new Set(allBankAccounts.map(b => b.last5Digits)));

            // 2. Group by Remittance Account (Last 5 Digits)
            const accountGroups = new Map<string, {
                last5: string;
                totalDeposit: number;
                transactions: typeof transactions;
            }>();

            const unidentifiableTransactions = [];

            for (const tx of transactions) {
                if (tx.deposit <= 0) continue;

                // Try to extract last 5 digits first (Exact or Pattern)
                let last5 = extractLast5Digits(tx.note || "");

                // If extracted last5 is not a known account, or if extraction failed, try fuzzy match
                // We check if the extracted last5 is in candidates to avoid false positives from random numbers
                if (!last5 || !candidateAccounts.includes(last5)) {
                    const matchResult = findBestAccountMatch(tx.note || "", candidateAccounts);
                    if (matchResult.match) {
                        last5 = matchResult.match;
                        console.log(`Fuzzy matched transaction ${tx.id} to account ${last5} (Score: ${matchResult.score})`);
                    } else {
                        // If fuzzy match failed, but we did extract something that looks like 5 digits, 
                        // we might still want to use it if we want to support "new unknown accounts"
                        // But for now, let's stick to matching against known accounts for safety,
                        // unless we want to allow creating new companies from unknown accounts.
                        // The original logic allowed unknown accounts.
                        if (!last5 && matchResult.match) {
                            last5 = matchResult.match;
                        }
                    }
                }

                // If still no last5, check if we extracted a pattern but it's not in candidates
                // In original logic: const last5Match = tx.note?.match(/\d{5}/); if (last5Match) ...
                // So we should preserve the ability to identify "unknown" accounts (not in DB yet)
                if (!last5) {
                    const rawLast5 = extractLast5Digits(tx.note || "");
                    if (rawLast5) {
                        last5 = rawLast5;
                    }
                }

                if (!last5) {
                    unidentifiableTransactions.push(tx);
                    continue;
                }

                if (!accountGroups.has(last5)) {
                    accountGroups.set(last5, {
                        last5,
                        totalDeposit: 0,
                        transactions: [],
                    });
                }

                const group = accountGroups.get(last5)!;
                group.transactions.push(tx);
                group.totalDeposit += tx.deposit;
            }

            // 3. Map Accounts to Companies
            const allLast5s = Array.from(accountGroups.keys());
            const bankAccounts = await prisma.bankAccount.findMany({
                where: { last5Digits: { in: allLast5s } },
                include: {
                    company: {
                        include: {
                            bankAccounts: true
                        }
                    }
                },
            });

            // Map Last5 -> CompanyIds
            const accountToCompanies = new Map<string, Set<string>>();
            // Map CompanyId -> Company Data
            const companyMap = new Map<string, CompanyWithAccounts>();

            for (const ba of bankAccounts) {
                if (!accountToCompanies.has(ba.last5Digits)) {
                    accountToCompanies.set(ba.last5Digits, new Set());
                }
                accountToCompanies.get(ba.last5Digits)!.add(ba.companyId);
                companyMap.set(ba.companyId, ba.company);
            }

            const results = [];
            const unknownAccounts = [];
            const ambiguousTransactions = []; // 共用帳號的交易
            const processedCompanies = new Set<string>();

            // 3.5 Pre-fetch invoice counts for shared accounts (Batch Optimization)
            const sharedAccountCompanyIds = new Set<string>();
            for (const group of accountGroups.values()) {
                const companyIds = accountToCompanies.get(group.last5);
                if (companyIds && companyIds.size > 1) {
                    companyIds.forEach(id => sharedAccountCompanyIds.add(id));
                }
            }

            const invoiceCounts = await prisma.invoice.groupBy({
                by: ['companyId'],
                where: {
                    companyId: { in: Array.from(sharedAccountCompanyIds) },
                    OR: [{ status: "unpaid" }, { status: "partial" }]
                },
                _count: { id: true }
            });

            const companyInvoiceCountMap = new Map<string, number>();
            invoiceCounts.forEach(ic => companyInvoiceCountMap.set(ic.companyId, ic._count.id));

            // 3.6 一次解析所有帳號的歸戶結果。
            // 這是純函式且不會修改 accountToCompanies，避免共用帳號被解析給某公司後，
            // 其他公司誤把它看成「非共用帳號」而重複認領同一筆入帳。
            const ownership = resolveAccountOwners(
                Array.from(accountGroups.keys()),
                accountToCompanies,
                (companyId) => companyInvoiceCountMap.get(companyId) || 0
            );

            // 4. Process each account group
            for (const group of accountGroups.values()) {
                const owner = ownership.get(group.last5);

                if (!owner || owner.kind === "unknown") {
                    unknownAccounts.push(group);
                    continue;
                }

                if (owner.kind === "ambiguous") {
                    console.log(`Account ${group.last5} is shared by ${owner.companyIds.length} companies with outstanding invoices — needs manual review`);
                    ambiguousTransactions.push(...group.transactions);
                    await prisma.transaction.updateMany({
                        where: { id: { in: group.transactions.map(t => t.id) } },
                        data: { status: "ambiguous" },
                    });
                    continue;
                }

                if (owner.kind === "idle") {
                    console.log(`Account ${group.last5}: no company has outstanding invoices, skipping`);
                    continue;
                }

                const companyId = owner.companyId;
                console.log(`Processing company ${companyId} for account group ${group.last5}`);

                if (processedCompanies.has(companyId)) {
                    // Already processed this company
                    continue;
                }

                processedCompanies.add(companyId);
                const company = companyMap.get(companyId)!;

                // Collect transactions from every account that resolved to THIS company
                const ownedLast5 = accountsOwnedBy(
                    companyId,
                    (company.bankAccounts || []).map((acc) => acc.last5Digits),
                    ownership
                );

                const companyTransactions: typeof transactions = [];
                let totalDeposit = 0;
                // 記住每筆交易實際入帳的帳號，溢繳才能歸到正確的後五碼
                const transactionLast5 = new Map<string, string>();

                for (const last5 of ownedLast5) {
                    const accGroup = accountGroups.get(last5);
                    if (!accGroup) continue;
                    companyTransactions.push(...accGroup.transactions);
                    totalDeposit += accGroup.totalDeposit;
                    for (const tx of accGroup.transactions) {
                        transactionLast5.set(tx.id, last5);
                    }
                }

                // Get overpayments for this company
                const companyOverpayments = overpayments.filter(op => op.companyId === companyId);
                const totalOverpayment = companyOverpayments.reduce((sum, op) => sum + op.amount, 0);
                totalDeposit += totalOverpayment;

                console.log(`Company ${company.name} has ${companyTransactions.length} transactions and ${companyOverpayments.length} overpayments with total deposit ${totalDeposit}`);

                if (companyTransactions.length === 0 && companyOverpayments.length === 0) {
                    continue;
                }

                // Fetch open invoices for this company
                const invoices = await prisma.invoice.findMany({
                    where: {
                        companyId: companyId,
                        OR: [{ status: "unpaid" }, { status: "partial" }],
                    },
                    orderBy: { date: "asc" }, // FIFO
                });

                console.log(`Company ${company.name} has ${invoices.length} open invoices`);

                const totalAR = invoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0);

                // Matching Logic (FIFO)
                const matches: MatchResult[] = [];

                // Prepare Funding Sources (Transactions + Overpayments)
                // 用可辨識聯集，讓 type 能正確窄化 source 的型別
                type FundingSource =
                    | { id: string; type: 'transaction'; amount: number; date: Date; source: Transaction }
                    | { id: string; type: 'overpayment'; amount: number; date: Date; source: OverpaymentWithCompany };

                const fundingSources: FundingSource[] = [
                    ...companyOverpayments.map(op => ({
                        id: op.id,
                        type: 'overpayment' as const,
                        amount: op.amount,
                        date: op.createdAt,
                        source: op
                    })),
                    ...companyTransactions.map(tx => ({
                        id: tx.id,
                        type: 'transaction' as const,
                        amount: tx.deposit,
                        date: tx.date,
                        source: tx
                    }))
                ];

                // Sort by date (FIFO)
                fundingSources.sort((a, b) => a.date.getTime() - b.date.getTime());

                console.log(`Starting FIFO matching for ${company.name}...`);

                // Data for batch updates
                const newReconciliations: Prisma.ReconciliationRecordCreateManyInput[] = [];
                const invoiceUpdates = new Map<string, { paidAmount: number, status: string }>();
                const transactionUpdates = new Map<string, { status: string, anomalyFlags?: string, anomalyScore?: number }>();
                const overpaymentUsage = new Map<string, number>();

                let currentSourceIndex = 0;
                let currentSourceRemaining = fundingSources[0]?.amount || 0;

                for (const invoice of invoices) {
                    if (currentSourceIndex >= fundingSources.length) break;

                    // Use current paidAmount from memory (handling multiple matches for same invoice)
                    let currentPaidAmount = invoice.paidAmount;
                    if (invoiceUpdates.has(invoice.id)) {
                        currentPaidAmount = invoiceUpdates.get(invoice.id)!.paidAmount;
                    }

                    let invoiceOutstanding = invoice.totalAmount - currentPaidAmount;
                    console.log(`  Processing invoice ${invoice.invoiceNumber || invoice.id}: outstanding ${invoiceOutstanding}`);

                    while (invoiceOutstanding > 0.01 && currentSourceIndex < fundingSources.length) {
                        const currentSource = fundingSources[currentSourceIndex];
                        const allocate = Math.min(currentSourceRemaining, invoiceOutstanding);

                        console.log(`    Allocating ${allocate} from ${currentSource.type} ${currentSource.id} (remaining: ${currentSourceRemaining})`);

                        if (allocate > 0) {
                            // 1. Prepare Reconciliation Record
                            newReconciliations.push({
                                invoiceId: invoice.id,
                                transactionId: currentSource.type === 'transaction' ? currentSource.id : null,
                                overpaymentId: currentSource.type === 'overpayment' ? currentSource.id : null,
                                amount: allocate,
                            });

                            matches.push({
                                invoiceId: invoice.id,
                                transactionId: currentSource.type === 'transaction' ? currentSource.id : null,
                                overpaymentId: currentSource.type === 'overpayment' ? currentSource.id : null,
                                amount: allocate,
                                type: currentSource.type
                            });

                            // 2. Update Invoice State (In Memory)
                            currentPaidAmount += allocate;
                            const newStatus = currentPaidAmount >= invoice.totalAmount - 0.01 ? "paid" : "partial";

                            invoiceUpdates.set(invoice.id, {
                                paidAmount: currentPaidAmount,
                                status: newStatus
                            });

                            invoiceOutstanding -= allocate;
                            currentSourceRemaining -= allocate;

                            // 3. Update Source State
                            if (currentSource.type === 'transaction') {
                                const currentTx = currentSource.source;
                                const flags = JSON.parse(currentTx.anomalyFlags || "[]");
                                let score = currentTx.anomalyScore || 0;
                                let hasNewAnomaly = false;

                                // Check for delayed payment (> 90 days)
                                const daysDiff = (currentTx.date.getTime() - invoice.date.getTime()) / (1000 * 60 * 60 * 24);
                                if (daysDiff > 90 && !flags.includes("delayed_payment")) {
                                    flags.push("delayed_payment");
                                    score += 20;
                                    hasNewAnomaly = true;
                                }

                                // Check for amount mismatch
                                if (Math.abs(currentTx.deposit - allocate) < 0.01) { // Full transaction used
                                    if (Math.abs(currentTx.deposit - invoice.totalAmount) > invoice.totalAmount * 0.05 && !flags.includes("amount_mismatch")) {
                                        flags.push("amount_mismatch");
                                        score += 40;
                                        hasNewAnomaly = true;
                                    }
                                }

                                transactionUpdates.set(currentTx.id, {
                                    status: "matched",
                                    anomalyFlags: hasNewAnomaly ? JSON.stringify(flags) : undefined,
                                    anomalyScore: hasNewAnomaly ? Math.min(score, 100) : undefined
                                });
                            } else {
                                // Overpayment
                                const used = overpaymentUsage.get(currentSource.id) || 0;
                                overpaymentUsage.set(currentSource.id, used + allocate);
                            }
                        }

                        if (currentSourceRemaining <= 0.0001) {
                            currentSourceIndex++;
                            if (currentSourceIndex < fundingSources.length) {
                                currentSourceRemaining = fundingSources[currentSourceIndex].amount;
                            }
                        }
                    }
                }

                // Execute Batch Updates for this company
                if (newReconciliations.length > 0) {
                    await prisma.$transaction(async (tx) => {
                        // 併發防護：在交易內重新確認這些交易仍是 unmatched 且未結帳。
                        // 若另一個請求已經先沖銷過，這裡就會少於預期，直接放棄本批次，
                        // 避免同一筆入帳被重複認領。
                        const stillOpen = await tx.transaction.findMany({
                            where: {
                                id: { in: companyTransactions.map(t => t.id) },
                                status: "unmatched",
                                closedMonth: null,
                            },
                            select: { id: true },
                        });

                        if (stillOpen.length !== companyTransactions.length) {
                            throw new ConcurrentMatchError(
                                t("autoMatch.concurrentMatch", {
                                    expected: companyTransactions.length,
                                    available: stillOpen.length,
                                })
                            );
                        }

                        await tx.reconciliationRecord.createMany({ data: newReconciliations });

                        for (const [id, data] of transactionUpdates.entries()) {
                            await tx.transaction.update({ where: { id }, data });
                        }

                        for (const [id, usedAmount] of overpaymentUsage.entries()) {
                            const op = companyOverpayments.find(o => o.id === id)!;
                            const remaining = op.amount - usedAmount;
                            if (remaining <= 0.01) {
                                await tx.overpayment.delete({ where: { id } });
                            } else {
                                await tx.overpayment.update({ where: { id }, data: { amount: remaining } });
                            }
                        }

                        // 發票餘額不採用迴圈中累積的 invoiceUpdates，改為在交易內
                        // 依實際寫入的銷帳記錄重算 —— 單一真相來源。
                        await syncInvoiceBalances(tx, invoiceUpdates.keys());
                    });
                }

                console.log(`Completed matching for ${company.name}: ${matches.length} reconciliations created`);

                // Handle Surplus (Create NEW Overpayments from unused Transactions)
                const unusedSources = [];
                if (currentSourceIndex < fundingSources.length) {
                    // Current source partial remainder
                    if (currentSourceRemaining > 0.01) {
                        unusedSources.push({
                            ...fundingSources[currentSourceIndex],
                            amount: currentSourceRemaining
                        });
                    }
                    // Subsequent sources
                    for (let i = currentSourceIndex + 1; i < fundingSources.length; i++) {
                        unusedSources.push(fundingSources[i]);
                    }
                }

                for (const source of unusedSources) {
                    if (source.type === 'transaction') {
                        // Convert to Overpayment
                        const tx = source.source;
                        const month = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
                        // 用這筆錢實際匯入的帳號，而不是公司名下的第一個帳號
                        const last5Digits = transactionLast5.get(tx.id)
                            || company.bankAccounts?.[0]?.last5Digits
                            || '';

                        // 建立溢繳與標記交易必須同進同退，否則會出現有記錄沒沖銷或反之
                        await prisma.$transaction([
                            prisma.overpayment.create({
                                data: {
                                    companyId: companyId,
                                    last5Digits: last5Digits,
                                    amount: source.amount,
                                    month: month,
                                    description: t("autoMatch.overpaymentFrom", { description: tx.description || '' }),
                                }
                            }),
                            prisma.transaction.update({
                                where: { id: tx.id },
                                data: { status: "matched" }
                            }),
                        ]);
                        console.log(`💰 Created overpayment from transaction ${tx.id}: ${source.amount}`);
                    }
                    // If type is overpayment, do nothing (it remains in DB with original amount if untouched, or updated amount if partially used)
                }

                results.push({
                    companyId: companyId,
                    companyName: company.name,
                    sourceAccounts: ownedLast5.filter(last5 => accountGroups.has(last5)),
                    totalDeposit: totalDeposit,
                    totalAR: totalAR,
                    remainingUnpaidAR: Math.max(0, totalAR - totalDeposit),
                    remainingSurplusDeposit: Math.max(0, totalDeposit - totalAR),
                    matchesCount: matches.length,
                    matches
                });
            }

            revalidatePath("/reconciliation");
            return {
                results,
                unknownAccounts,
                unidentifiableTransactions,
                ambiguousTransactions, // 新增：需要人工審核的交易
            };
        },
        "autoMatchTransactions",
        autoMatchSchema,
        rawData
    );
}

export async function getOverpayments(month?: string) {
    // If month is specified, filter by that month
    // Otherwise, return all overpayments (for inheritance across months)
    const whereClause = month ? { month } : {};

    return await prisma.overpayment.findMany({
        where: whereClause,
        include: {
            company: {
                include: {
                    bankAccounts: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}
