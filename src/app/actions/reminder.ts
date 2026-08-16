"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createInvoiceReminder(invoiceId: string, date: Date, text?: string) {
    try {
        const reminder = await prisma.invoiceReminder.create({
            data: {
                invoiceId,
                date,
                text,
                completed: false,
            },
        });

        revalidatePath("/reconciliation");
        revalidatePath("/dashboard"); // Assuming dashboard shows reminders
        return { success: true, data: reminder };
    } catch (error) {
        console.error("Error creating invoice reminder:", error);
        throw new Error("Failed to create reminder");
    }
}
