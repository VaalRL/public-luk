"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withErrorHandling, ValidationError, type ActionResult } from "@/lib/action-wrapper";
import {
    PDF_TEMPLATE_CONFIG_KEY,
    defaultPdfTemplate,
    parsePdfTemplate,
    pdfTemplateInputSchema,
    resolvePdfTemplate,
    type PdfTemplate,
} from "@/lib/pdf-template";

/**
 * 讀取報價單 PDF 版型設定。
 *
 * 沒設定過、資料壞掉、甚至資料庫讀不到，都回傳預設版型 ——
 * 使用者按下下載時最不該遇到的就是「因為設定有問題所以印不出來」。
 */
export async function getPdfTemplate(): Promise<PdfTemplate> {
    try {
        const row = await prisma.systemConfig.findUnique({
            where: { key: PDF_TEMPLATE_CONFIG_KEY },
        });
        return parsePdfTemplate(row?.value);
    } catch (error) {
        console.error("讀取 PDF 版型設定失敗，改用預設版型:", error);
        return defaultPdfTemplate;
    }
}

/**
 * 儲存版型設定。
 *
 * 存進資料庫的一律是「與預設值合併後的完整設定」，不是使用者送來的片段：
 * 這樣之後新增欄位時舊資料不會缺鍵，讀取端也不必處理半套設定。
 */
export async function savePdfTemplate(rawData: unknown): Promise<ActionResult<PdfTemplate>> {
    return withErrorHandling(async () => {
        // 先用嚴格的 schema 驗證使用者輸入（欄寬總和、日期格式等在此擋下），
        // 通過後才與預設值合併成完整設定。
        const parsed = pdfTemplateInputSchema.safeParse(rawData);
        if (!parsed.success) {
            // Zod 的原始錯誤是一大包 JSON，直接丟到畫面上沒人看得懂，
            // 轉成「欄位：訊息」的形式。
            throw new ValidationError(
                parsed.error.issues
                    .map((i) => `${i.path.join(".") || "設定"}：${i.message}`)
                    .join("；")
            );
        }
        const input = parsed.data;
        const merged = resolvePdfTemplate({
            labels: { ...defaultPdfTemplate.labels, ...input.labels },
            layout: { ...defaultPdfTemplate.layout, ...input.layout },
            options: { ...defaultPdfTemplate.options, ...input.options },
        });

        await prisma.systemConfig.upsert({
            where: { key: PDF_TEMPLATE_CONFIG_KEY },
            update: { value: JSON.stringify(merged) },
            create: {
                // SystemConfig.id 的預設值是固定字串，多筆設定必須自己指定 id
                id: PDF_TEMPLATE_CONFIG_KEY,
                key: PDF_TEMPLATE_CONFIG_KEY,
                value: JSON.stringify(merged),
            },
        });

        revalidatePath("/settings");
        revalidatePath("/invoicing");
        return merged;
    }, "savePdfTemplate");
}

/** 還原成預設版型 */
export async function resetPdfTemplate(): Promise<ActionResult<PdfTemplate>> {
    return withErrorHandling(async () => {
        await prisma.systemConfig.deleteMany({ where: { key: PDF_TEMPLATE_CONFIG_KEY } });
        revalidatePath("/settings");
        revalidatePath("/invoicing");
        return defaultPdfTemplate;
    }, "resetPdfTemplate");
}
