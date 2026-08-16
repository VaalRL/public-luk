"use server";

import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function getDashboardStats() {
    const now = new Date();
    const startOfThisMonth = startOfMonth(now);
    const endOfThisMonth = endOfMonth(now);

    // Total receivables (all invoices total amount, regardless of payment status)
    const allInvoices = await prisma.invoice.findMany();

    const totalReceivables = allInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0
    );

    // This month's invoices (only newly created invoices this month)
    const thisMonthInvoices = await prisma.invoice.findMany({
        where: {
            createdAt: {
                gte: startOfThisMonth,
                lte: endOfThisMonth,
            },
        },
    });

    const thisMonthBilled = thisMonthInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0
    );

    // This month's collections
    const thisMonthReconciliations = await prisma.reconciliationRecord.findMany({
        where: {
            date: {
                gte: startOfThisMonth,
                lte: endOfThisMonth,
            },
        },
    });

    const thisMonthCollected = thisMonthReconciliations.reduce(
        (sum, rec) => sum + rec.amount,
        0
    );

    // Outstanding balance (Total Amount - Paid Amount)
    const outstandingBalance = allInvoices.reduce(
        (sum, inv) => sum + (inv.totalAmount - inv.paidAmount),
        0
    );

    // Total companies
    const totalCompanies = await prisma.company.count();

    // Total invoices
    const totalInvoices = await prisma.invoice.count();

    return {
        totalReceivables,
        thisMonthBilled,
        thisMonthCollected,
        outstandingBalance,
        totalCompanies,
        totalInvoices,
    };
}

export async function getMonthlyRevenue(months: number = 6) {
    const now = new Date();
    const oldestMonth = subMonths(now, months - 1);
    const startDate = startOfMonth(oldestMonth);
    const endDate = endOfMonth(now);

    // Single query for all invoices in the date range
    const invoices = await prisma.invoice.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            date: true,
            totalAmount: true,
        },
    });

    // Single query for all reconciliations in the date range
    const reconciliations = await prisma.reconciliationRecord.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        select: {
            date: true,
            amount: true,
        },
    });

    // Group data by month in memory
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
        const monthDate = subMonths(now, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const billed = invoices
            .filter(inv => inv.date >= monthStart && inv.date <= monthEnd)
            .reduce((sum, inv) => sum + inv.totalAmount, 0);

        const collected = reconciliations
            .filter(rec => rec.date >= monthStart && rec.date <= monthEnd)
            .reduce((sum, rec) => sum + rec.amount, 0);

        data.push({
            month: format(monthDate, "yyyy-MM"),
            monthLabel: format(monthDate, "MM月"),
            billed,
            collected,
        });
    }

    return data;
}

export async function getRecentActivity() {
    const recentInvoices = await prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
            company: true,
        },
    });

    const recentReconciliations = await prisma.reconciliationRecord.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
            invoice: {
                include: {
                    company: true,
                },
            },
            transaction: true,
        },
    });

    return {
        recentInvoices,
        recentReconciliations,
    };
}

export async function getReconciliationsByMonth(monthStr: string) {
    const [year, month] = monthStr.split("-").map(Number);
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const reconciliations = await prisma.reconciliationRecord.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate,
            },
        },
        include: {
            invoice: {
                include: {
                    company: true,
                },
            },
            transaction: true,
        },
        orderBy: {
            date: "desc",
        },
    });

    return reconciliations;
}

export async function getInvoiceReminders() {
    const reminders = await prisma.invoiceReminder.findMany({
        include: {
            invoice: {
                include: {
                    company: true,
                },
            },
        },
        orderBy: {
            date: "asc",
        },
    });
    return reminders;
}
