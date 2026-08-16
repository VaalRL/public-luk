import { bench, describe, beforeAll } from 'vitest';
import { createInvoice } from '@/app/actions/invoice';
import { prisma } from '@/lib/prisma';

describe('Invoice Creation Performance', () => {
    let companyId: string;
    let providerId: string;

    beforeAll(async () => {
        // Create dummy company
        const company = await prisma.company.create({
            data: {
                name: 'Benchmark Company',
                taxId: '12345678',
            }
        });
        companyId = company.id;

        // Create dummy provider
        const provider = await prisma.company.create({
            data: {
                name: 'Benchmark Provider',
                shortName: 'BP',
            }
        });
        providerId = provider.id;
    });

    bench('create single invoice', async () => {
        await createInvoice({
            companyId,
            providerId,
            date: new Date(),
            amount: 1000,
            taxAmount: 50,
            items: [{ name: 'Test Item', quantity: 1, price: 1000, amount: 1000 }],
            title: 'Benchmark Invoice',
        });
    });

    bench('create invoice with 50 items', async () => {
        const items = Array(50).fill({ name: 'Bulk Item', quantity: 1, price: 20, amount: 20 });
        await createInvoice({
            companyId,
            providerId,
            date: new Date(),
            amount: 1000,
            taxAmount: 50,
            items,
            title: 'Benchmark Bulk Invoice',
        });
    });
});
