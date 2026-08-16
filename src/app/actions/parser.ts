"use server";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ParserConfig = {
    headerRow: number;
    // 以下欄位由使用者在對應畫面自由指定，未必每個都會設定，
    // 消費端（bank-statement-upload）本來就以 !== undefined 檢查後才使用。
    dateCol?: number;
    descriptionCol?: number;
    depositCol?: number;
    withdrawalCol?: number;
    balanceCol?: number;
    noteCol?: number;
};

export async function getParserTemplates() {
    return await prisma.parserTemplate.findMany({
        orderBy: { createdAt: "desc" },
    });
}

export async function createParserTemplate(data: {
    name: string;
    config: ParserConfig;
}) {
    const template = await prisma.parserTemplate.create({
        data: {
            name: data.name,
            config: JSON.stringify(data.config),
        },
    });
    revalidatePath("/settings");
    return template;
}

export async function updateParserTemplate(
    id: string,
    data: {
        name?: string;
        config?: ParserConfig;
    }
) {
    const updateData: Prisma.ParserTemplateUpdateInput = {};
    if (data.name) updateData.name = data.name;
    if (data.config) updateData.config = JSON.stringify(data.config);

    const template = await prisma.parserTemplate.update({
        where: { id },
        data: updateData,
    });
    revalidatePath("/settings");
    return template;
}

export async function deleteParserTemplate(id: string) {
    await prisma.parserTemplate.delete({
        where: { id },
    });
    revalidatePath("/settings");
}

/**
 * 獲取解析器模板數量（用於紅點提示）
 */
export async function getParserTemplateCount(): Promise<number> {
    return await prisma.parserTemplate.count();
}

/**
 * 檢查是否需要顯示解析器設定提醒（模板數量 < 1）
 */
export async function shouldShowParserReminder(): Promise<boolean> {
    const count = await getParserTemplateCount();
    return count < 1;
}
