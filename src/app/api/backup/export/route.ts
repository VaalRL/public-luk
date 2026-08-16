import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const companies = await prisma.company.findMany({
            include: {
                bankAccounts: true,
            },
        });

        const parserTemplates = await prisma.parserTemplate.findMany();
        const invoiceItemTemplates = await prisma.invoiceItemTemplate.findMany();
        const notificationTemplates = await prisma.notificationTemplate.findMany();

        const invoices = await prisma.invoice.findMany();

        const bankStatements = await prisma.bankStatement.findMany({
            include: {
                transactions: true,
            },
        });

        const reconciliationRecords = await prisma.reconciliationRecord.findMany();

        const data = {
            companies,
            parserTemplates,
            invoiceItemTemplates,
            notificationTemplates,
            invoices,
            bankStatements,
            reconciliationRecords,
            timestamp: new Date().toISOString(),
            version: "1.0",
        };

        const json = JSON.stringify(data, null, 2);
        const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(json, {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Export failed:", error);
        return NextResponse.json(
            { error: "Export failed" },
            { status: 500 }
        );
    }
}
