"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getInvoiceItemTemplates() {
    return await prisma.invoiceItemTemplate.findMany({
        orderBy: { name: "asc" },
    });
}

export async function createInvoiceItemTemplate(data: { name: string; quantity?: number; price?: number }) {
    const template = await prisma.invoiceItemTemplate.create({
        data: {
            name: data.name,
            quantity: data.quantity || 1,
            price: data.price || 0,
        },
    });
    revalidatePath("/settings");
    return template;
}

export async function updateInvoiceItemTemplate(id: string, data: { name?: string; quantity?: number; price?: number }) {
    const template = await prisma.invoiceItemTemplate.update({
        where: { id },
        data,
    });
    revalidatePath("/settings");
    return template;
}

export async function deleteInvoiceItemTemplate(id: string) {
    await prisma.invoiceItemTemplate.delete({
        where: { id },
    });
    revalidatePath("/settings");
}

/**
 * 獲取帳單項目模板數量（用於紅點提示）
 */
export async function getInvoiceItemTemplateCount(): Promise<number> {
    return await prisma.invoiceItemTemplate.count();
}

/**
 * 檢查是否需要顯示帳單項目設定提醒（項目數量 < 1）
 */
export async function shouldShowInvoiceItemReminder(): Promise<boolean> {
    const count = await getInvoiceItemTemplateCount();
    return count < 1;
}
