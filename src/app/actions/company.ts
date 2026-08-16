"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withErrorHandling, withValidation, type ActionResult } from "@/lib/action-wrapper";
import { createCompanySchema, updateCompanySchema, addBankAccountSchema } from "@/lib/validations/company";
import { Company, BankAccount } from "@prisma/client";

export async function getCompanies() {
    return await prisma.company.findMany({
        include: {
            bankAccounts: true,
            _count: {
                select: { clientInvoices: true },
            },
        },
        orderBy: { name: "asc" },
    });
}

/**
 * 獲取公司數量（用於紅點提示）
 * 當公司數量 < 2 時，顯示紅點提醒
 */
export async function getCompanyCount(): Promise<number> {
    return await prisma.company.count();
}

/**
 * 檢查是否需要顯示公司設定提醒（公司數量 < 2）
 */
export async function shouldShowCompanyReminder(): Promise<boolean> {
    const count = await getCompanyCount();
    return count < 2;
}

export async function createCompany(rawData: unknown): Promise<ActionResult<Company>> {
    return withValidation(
        async (data) => {
            const { bankAccounts, ...companyData } = data;

            const company = await prisma.company.create({
                data: {
                    ...companyData,
                    bankAccounts: {
                        create: bankAccounts?.map(acc => ({
                            accountNumber: acc.accountNumber,
                            branch: acc.branch,
                            accountHolder: acc.accountHolder,
                            currency: acc.currency || 'TWD',
                            note: acc.note,
                            last5Digits: acc.accountNumber.replace(/\D/g, '').slice(-5),
                        }))
                    }
                },
            });
            revalidatePath("/settings");
            return company;
        },
        "createCompany",
        createCompanySchema,
        rawData
    );
}

export async function updateCompany(
    id: string,
    rawData: unknown
): Promise<ActionResult<Company>> {
    return withValidation(
        async (data) => {
            // Remove bankAccounts from update data as they are handled separately
            const { bankAccounts: _bankAccounts, ...updateData } = data;

            const company = await prisma.company.update({
                where: { id },
                data: updateData,
            });
            revalidatePath("/settings");
            return company;
        },
        "updateCompany",
        updateCompanySchema,
        rawData
    );
}

export async function deleteCompany(id: string): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        await prisma.company.delete({
            where: { id },
        });
        revalidatePath("/settings");
    }, "deleteCompany");
}

export async function addBankAccount(rawData: unknown): Promise<ActionResult<BankAccount>> {
    return withValidation(
        async (data) => {
            const { companyId, ...accountData } = data;
            // Extract last 5 digits for backward compatibility
            const last5Digits = accountData.accountNumber.replace(/\D/g, '').slice(-5);

            const account = await prisma.bankAccount.create({
                data: {
                    companyId,
                    accountNumber: accountData.accountNumber,
                    branch: accountData.branch,
                    accountHolder: accountData.accountHolder,
                    currency: accountData.currency || 'TWD',
                    note: accountData.note,
                    last5Digits,
                },
            });
            revalidatePath("/settings");
            return account;
        },
        "addBankAccount",
        addBankAccountSchema,
        rawData
    );
}

export async function deleteBankAccount(id: string): Promise<ActionResult<void>> {
    return withErrorHandling(async () => {
        await prisma.bankAccount.delete({
            where: { id },
        });
        revalidatePath("/settings");
    }, "deleteBankAccount");
}
