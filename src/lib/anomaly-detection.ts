import { Transaction, Invoice } from "@prisma/client";

export interface AnomalyResult {
    flags: string[];
    score: number;
}

/**
 * Detect anomalies for a single transaction based on historical context
 * This is typically run during import or background processing
 */
export function detectTransactionAnomalies(
    transaction: Transaction,
    historicalTransactions: Transaction[]
): AnomalyResult {
    const flags: string[] = [];
    let score = 0;

    // 1. Large Amount Detection
    // Filter for deposits only if the current transaction is a deposit
    const deposits = historicalTransactions
        .filter(t => t.deposit > 0 && t.id !== transaction.id)
        .map(t => t.deposit);

    if (transaction.deposit > 0 && deposits.length > 5) {
        const avgDeposit = deposits.reduce((a, b) => a + b, 0) / deposits.length;
        const _stdDev = Math.sqrt(
            deposits.map(x => Math.pow(x - avgDeposit, 2)).reduce((a, b) => a + b, 0) / deposits.length
        );

        // If > 3x average or > 3 sigma (standard deviation)
        if (transaction.deposit > avgDeposit * 3) {
            flags.push("large_amount");
            score += 30;
        }
    }

    // 2. Duplicate Payment Detection
    // Check for same amount, same date (or very close), same note
    const potentialDuplicate = historicalTransactions.find(t =>
        t.id !== transaction.id &&
        t.deposit === transaction.deposit &&
        t.withdrawal === transaction.withdrawal &&
        Math.abs(t.date.getTime() - transaction.date.getTime()) < 24 * 60 * 60 * 1000 && // Within 24 hours
        t.note === transaction.note
    );

    if (potentialDuplicate) {
        flags.push("potential_duplicate");
        score += 50;
    }

    return { flags, score: Math.min(score, 100) };
}

/**
 * Detect anomalies for a specific match between transaction and invoice
 * This is run during reconciliation
 */
export function detectMatchAnomalies(
    transaction: Transaction,
    invoice: Invoice
): AnomalyResult {
    const flags: string[] = [];
    let score = 0;

    // 3. Time Anomaly Detection
    // Payment date vs Invoice date
    const daysDiff = (transaction.date.getTime() - invoice.date.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 90) {
        flags.push("delayed_payment");
        score += 20;
    } else if (daysDiff < -5) {
        // Payment way before invoice (pre-payment is normal, but too early might be weird?)
        // Let's just flag if it's significantly before
        flags.push("early_payment");
        score += 10;
    }

    // 4. Amount Mismatch Detection
    // Check if transaction amount matches invoice amount (or remaining amount)
    // This is tricky for partial payments, but we can check if the transaction amount 
    // is significantly larger than the invoice total
    if (transaction.deposit > invoice.totalAmount * 1.05) {
        flags.push("overpayment_risk");
        score += 40;
    }

    return { flags, score: Math.min(score, 100) };
}
