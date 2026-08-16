import { describe, it, expect } from 'vitest';
import {
    invoiceItemSchema,
    invoiceFormSchema,
    createInvoiceSchema,
    recordManualPaymentSchema
} from './invoice';

describe('Invoice Validation Schemas', () => {
    describe('invoiceItemSchema', () => {
        it('should validate a valid service item', () => {
            const validItem = {
                type: 'service' as const,
                name: '網站開發',
                quantity: 1,
                price: 50000,
                amount: 50000,
            };

            const result = invoiceItemSchema.safeParse(validItem);
            expect(result.success).toBe(true);
        });

        it('should validate a valid reimbursement item', () => {
            const validItem = {
                type: 'reimbursement' as const,
                name: '交通費',
                quantity: 1,
                price: 500,
                amount: 500,
            };

            const result = invoiceItemSchema.safeParse(validItem);
            expect(result.success).toBe(true);
        });

        it('should reject item with empty name', () => {
            const invalidItem = {
                name: '',
                quantity: 1,
                price: 100,
                amount: 100,
            };

            const result = invoiceItemSchema.safeParse(invalidItem);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('品項名稱不可為空');
            }
        });

        it('should reject item with negative quantity', () => {
            const invalidItem = {
                name: '測試項目',
                quantity: -1,
                price: 100,
                amount: 100,
            };

            const result = invoiceItemSchema.safeParse(invalidItem);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('數量必須大於等於 0');
            }
        });

        it('should accept optional fields', () => {
            const itemWithOptionals = {
                name: '測試項目',
                quantity: 1,
                price: 100,
                amount: 100,
                content: '詳細說明',
                note: '備註',
                category: '服務類',
            };

            const result = invoiceItemSchema.safeParse(itemWithOptionals);
            expect(result.success).toBe(true);
        });
    });

    describe('invoiceFormSchema', () => {
        it('should validate a complete invoice form', () => {
            const validForm = {
                companyId: 'company-123',
                providerId: 'provider-456',
                date: new Date('2025-11-30'),
                title: '網站開發專案',
                items: [
                    {
                        name: '網站開發',
                        quantity: 1,
                        price: 50000,
                        amount: 50000,
                    },
                ],
                taxRate: 5,
                issueInvoice: true,
            };

            const result = invoiceFormSchema.safeParse(validForm);
            expect(result.success).toBe(true);
        });

        it('should reject form without companyId', () => {
            const invalidForm = {
                providerId: 'provider-456',
                date: new Date(),
                title: '測試',
                items: [{ name: '項目', quantity: 1, price: 100, amount: 100 }],
                taxRate: 5,
                issueInvoice: false,
            };

            const result = invoiceFormSchema.safeParse(invalidForm);
            expect(result.success).toBe(false);
        });

        it('should reject form with empty items array', () => {
            const invalidForm = {
                companyId: 'company-123',
                providerId: 'provider-456',
                date: new Date(),
                title: '測試',
                items: [],
                taxRate: 5,
                issueInvoice: false,
            };

            const result = invoiceFormSchema.safeParse(invalidForm);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('至少需要一個品項');
            }
        });

        it('should reject invalid tax rate', () => {
            const invalidForm = {
                companyId: 'company-123',
                providerId: 'provider-456',
                date: new Date(),
                title: '測試',
                items: [{ name: '項目', quantity: 1, price: 100, amount: 100 }],
                taxRate: 150, // Invalid: > 100
                issueInvoice: false,
            };

            const result = invoiceFormSchema.safeParse(invalidForm);
            expect(result.success).toBe(false);
        });
    });

    describe('createInvoiceSchema', () => {
        it('should validate a valid create invoice request', () => {
            const validData = {
                companyId: '550e8400-e29b-41d4-a716-446655440000',
                providerId: '550e8400-e29b-41d4-a716-446655440001',
                date: new Date('2025-11-30'),
                amount: 50000,
                taxAmount: 2500,
                items: [
                    {
                        name: '網站開發',
                        quantity: 1,
                        price: 50000,
                        amount: 50000,
                    },
                ],
                issueInvoice: true,
            };

            const result = createInvoiceSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject invalid UUID for companyId', () => {
            const invalidData = {
                companyId: 'not-a-uuid',
                date: new Date(),
                amount: 100,
                taxAmount: 5,
                items: [{ name: '項目', quantity: 1, price: 100, amount: 100 }],
            };

            const result = createInvoiceSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].message).toBe('無效的公司 ID');
            }
        });

        it('should accept optional reminders', () => {
            const dataWithReminders = {
                companyId: '550e8400-e29b-41d4-a716-446655440000',
                date: new Date(),
                amount: 100,
                taxAmount: 5,
                items: [{ name: '項目', quantity: 1, price: 100, amount: 100 }],
                reminders: [
                    { date: new Date('2025-12-01'), text: '第一次提醒' },
                    { date: new Date('2025-12-15') },
                ],
            };

            const result = createInvoiceSchema.safeParse(dataWithReminders);
            expect(result.success).toBe(true);
        });
    });

    describe('recordManualPaymentSchema', () => {
        it('should validate a valid manual payment', () => {
            const validPayment = {
                invoiceId: '550e8400-e29b-41d4-a716-446655440000',
                amount: 50000,
                date: new Date('2025-11-30'),
            };

            const result = recordManualPaymentSchema.safeParse(validPayment);
            expect(result.success).toBe(true);
        });

        it('should reject payment with negative amount', () => {
            const invalidPayment = {
                invoiceId: '550e8400-e29b-41d4-a716-446655440000',
                amount: -100,
                date: new Date(),
            };

            const result = recordManualPaymentSchema.safeParse(invalidPayment);
            expect(result.success).toBe(false);
        });

        it('should accept optional note', () => {
            const paymentWithNote = {
                invoiceId: '550e8400-e29b-41d4-a716-446655440000',
                amount: 50000,
                date: new Date(),
                note: '銀行轉帳',
            };

            const result = recordManualPaymentSchema.safeParse(paymentWithNote);
            expect(result.success).toBe(true);
        });
    });
});
