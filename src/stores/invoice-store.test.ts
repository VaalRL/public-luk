import { describe, it, expect, beforeEach } from 'vitest';
import { useInvoiceStore, Invoice } from './invoice-store';

// Mock invoice data
const mockInvoice1: Invoice = {
    id: '1',
    invoiceNumber: 'INV-001',
    title: '網站開發',
    date: new Date('2025-11-01'),
    amount: 50000,
    taxAmount: 2500,
    totalAmount: 52500,
    status: 'unpaid',
    paidAmount: 0,
    items: JSON.stringify([]),
    companyId: 'company-1',
    company: { id: 'company-1', name: '測試公司 A' },
};

const mockInvoice2: Invoice = {
    id: '2',
    invoiceNumber: 'INV-002',
    title: 'UI 設計',
    date: new Date('2025-11-15'),
    amount: 30000,
    taxAmount: 1500,
    totalAmount: 31500,
    status: 'paid',
    paidAmount: 31500,
    items: JSON.stringify([]),
    companyId: 'company-2',
    company: { id: 'company-2', name: '測試公司 B' },
};

const mockInvoice3: Invoice = {
    id: '3',
    invoiceNumber: 'INV-003',
    title: '維護服務',
    date: new Date('2025-11-20'),
    amount: 10000,
    taxAmount: 500,
    totalAmount: 10500,
    status: 'partial',
    paidAmount: 5000,
    items: JSON.stringify([]),
    companyId: 'company-1',
    company: { id: 'company-1', name: '測試公司 A' },
};

describe('Invoice Store', () => {
    beforeEach(() => {
        // Reset store before each test
        useInvoiceStore.getState().reset();
    });

    describe('Initial State', () => {
        it('should have empty invoices array', () => {
            const { invoices } = useInvoiceStore.getState();
            expect(invoices).toEqual([]);
        });

        it('should have null currentInvoice', () => {
            const { currentInvoice } = useInvoiceStore.getState();
            expect(currentInvoice).toBeNull();
        });

        it('should not be loading', () => {
            const { isLoading } = useInvoiceStore.getState();
            expect(isLoading).toBe(false);
        });

        it('should have no error', () => {
            const { error } = useInvoiceStore.getState();
            expect(error).toBeNull();
        });
    });

    describe('setInvoices', () => {
        it('should set invoices', () => {
            const { setInvoices } = useInvoiceStore.getState();
            setInvoices([mockInvoice1, mockInvoice2]);

            const { invoices } = useInvoiceStore.getState();
            expect(invoices).toHaveLength(2);
            expect(invoices[0].id).toBe('1');
            expect(invoices[1].id).toBe('2');
        });

        it('should clear error when setting invoices', () => {
            const { setError, setInvoices } = useInvoiceStore.getState();
            setError('Test error');
            setInvoices([mockInvoice1]);

            const { error } = useInvoiceStore.getState();
            expect(error).toBeNull();
        });
    });

    describe('setCurrentInvoice', () => {
        it('should set current invoice', () => {
            const { setCurrentInvoice } = useInvoiceStore.getState();
            setCurrentInvoice(mockInvoice1);

            const { currentInvoice } = useInvoiceStore.getState();
            expect(currentInvoice).toEqual(mockInvoice1);
        });

        it('should clear current invoice', () => {
            const { setCurrentInvoice } = useInvoiceStore.getState();
            setCurrentInvoice(mockInvoice1);
            setCurrentInvoice(null);

            const { currentInvoice } = useInvoiceStore.getState();
            expect(currentInvoice).toBeNull();
        });
    });

    describe('addInvoice', () => {
        it('should add invoice to empty list', () => {
            const { addInvoice } = useInvoiceStore.getState();
            addInvoice(mockInvoice1);

            const { invoices } = useInvoiceStore.getState();
            expect(invoices).toHaveLength(1);
            expect(invoices[0]).toEqual(mockInvoice1);
        });

        it('should add invoice to existing list', () => {
            const { setInvoices, addInvoice } = useInvoiceStore.getState();
            setInvoices([mockInvoice1]);
            addInvoice(mockInvoice2);

            const { invoices } = useInvoiceStore.getState();
            expect(invoices).toHaveLength(2);
            expect(invoices[1]).toEqual(mockInvoice2);
        });
    });

    describe('updateInvoice', () => {
        it('should update invoice in list', () => {
            const { setInvoices, updateInvoice } = useInvoiceStore.getState();
            setInvoices([mockInvoice1, mockInvoice2]);

            updateInvoice('1', { paidAmount: 10000, status: 'partial' });

            const { invoices } = useInvoiceStore.getState();
            expect(invoices[0].paidAmount).toBe(10000);
            expect(invoices[0].status).toBe('partial');
        });

        it('should update current invoice if it matches', () => {
            const { setCurrentInvoice, updateInvoice } = useInvoiceStore.getState();
            setCurrentInvoice(mockInvoice1);

            updateInvoice('1', { title: '更新後的標題' });

            const { currentInvoice } = useInvoiceStore.getState();
            expect(currentInvoice?.title).toBe('更新後的標題');
        });

        it('should not update other invoices', () => {
            const { setInvoices, updateInvoice } = useInvoiceStore.getState();
            setInvoices([mockInvoice1, mockInvoice2]);

            updateInvoice('1', { amount: 99999 });

            const { invoices } = useInvoiceStore.getState();
            expect(invoices[1].amount).toBe(30000); // Should remain unchanged
        });
    });

    describe('deleteInvoice', () => {
        it('should delete invoice from list', () => {
            const { setInvoices, deleteInvoice } = useInvoiceStore.getState();
            setInvoices([mockInvoice1, mockInvoice2]);

            deleteInvoice('1');

            const { invoices } = useInvoiceStore.getState();
            expect(invoices).toHaveLength(1);
            expect(invoices[0].id).toBe('2');
        });

        it('should clear current invoice if it matches', () => {
            const { setCurrentInvoice, deleteInvoice } = useInvoiceStore.getState();
            setCurrentInvoice(mockInvoice1);

            deleteInvoice('1');

            const { currentInvoice } = useInvoiceStore.getState();
            expect(currentInvoice).toBeNull();
        });

        it('should not clear current invoice if it does not match', () => {
            const { setCurrentInvoice, deleteInvoice } = useInvoiceStore.getState();
            setCurrentInvoice(mockInvoice1);

            deleteInvoice('2');

            const { currentInvoice } = useInvoiceStore.getState();
            expect(currentInvoice).toEqual(mockInvoice1);
        });
    });

    describe('getInvoiceById', () => {
        it('should find invoice by id', () => {
            const { setInvoices, getInvoiceById } = useInvoiceStore.getState();
            setInvoices([mockInvoice1, mockInvoice2]);

            const invoice = getInvoiceById('1');
            expect(invoice).toEqual(mockInvoice1);
        });

        it('should return undefined for non-existent id', () => {
            const { setInvoices, getInvoiceById } = useInvoiceStore.getState();
            setInvoices([mockInvoice1]);

            const invoice = getInvoiceById('999');
            expect(invoice).toBeUndefined();
        });
    });

    describe('getUnpaidInvoices', () => {
        it('should return only unpaid invoices', () => {
            const { setInvoices, getUnpaidInvoices } = useInvoiceStore.getState();
            setInvoices([mockInvoice1, mockInvoice2, mockInvoice3]);

            const unpaid = getUnpaidInvoices();
            expect(unpaid).toHaveLength(2);
            expect(unpaid.map(inv => inv.id)).toEqual(['1', '3']);
        });

        it('should return empty array when all invoices are paid', () => {
            const { setInvoices, getUnpaidInvoices } = useInvoiceStore.getState();
            setInvoices([mockInvoice2]);

            const unpaid = getUnpaidInvoices();
            expect(unpaid).toHaveLength(0);
        });
    });

    describe('getInvoicesByCompany', () => {
        it('should return invoices for specific company', () => {
            const { setInvoices, getInvoicesByCompany } = useInvoiceStore.getState();
            setInvoices([mockInvoice1, mockInvoice2, mockInvoice3]);

            const companyInvoices = getInvoicesByCompany('company-1');
            expect(companyInvoices).toHaveLength(2);
            expect(companyInvoices.map(inv => inv.id)).toEqual(['1', '3']);
        });

        it('should return empty array for company with no invoices', () => {
            const { setInvoices, getInvoicesByCompany } = useInvoiceStore.getState();
            setInvoices([mockInvoice1]);

            const companyInvoices = getInvoicesByCompany('company-999');
            expect(companyInvoices).toHaveLength(0);
        });
    });

    describe('reset', () => {
        it('should reset to initial state', () => {
            const { setInvoices, setCurrentInvoice, setError, setLoading, reset } = useInvoiceStore.getState();

            // Set some state
            setInvoices([mockInvoice1, mockInvoice2]);
            setCurrentInvoice(mockInvoice1);
            setError('Test error');
            setLoading(true);

            // Reset
            reset();

            const state = useInvoiceStore.getState();
            expect(state.invoices).toEqual([]);
            expect(state.currentInvoice).toBeNull();
            expect(state.error).toBeNull();
            expect(state.isLoading).toBe(false);
        });
    });
});
