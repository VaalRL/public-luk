"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getNotificationTemplates() {
    try {
        const templates = await prisma.notificationTemplate.findMany({
            orderBy: { type: 'asc' }
        });

        // 如果沒有範本，建立預設範本
        if (templates.length === 0) {
            const defaultTemplates = [
                {
                    type: "payment_reminder",
                    template: "您好，提醒您尚有應收帳款 ${amount} 元（單號：{invoiceNumber}），請盡快安排付款。謝謝！"
                },
                {
                    type: "payment_confirmed",
                    template: "您好，已確認收到款項 ${amount} 元（單號：{invoiceNumber}），感謝您的配合！"
                }
            ];

            await prisma.notificationTemplate.createMany({
                data: defaultTemplates
            });

            return await prisma.notificationTemplate.findMany({
                orderBy: { type: 'asc' }
            });
        }

        return templates;
    } catch (error) {
        console.error("Error fetching notification templates:", error);
        throw error;
    }
}

export async function updateNotificationTemplate(type: string, template: string) {
    try {
        const result = await prisma.notificationTemplate.upsert({
            where: { type },
            update: { template },
            create: { type, template }
        });

        revalidatePath("/settings");
        return result;
    } catch (error) {
        console.error("Error updating notification template:", error);
        throw error;
    }
}


