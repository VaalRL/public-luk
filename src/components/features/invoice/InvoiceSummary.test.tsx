import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithLocale } from '@/test/i18n';
import { InvoiceSummary } from './InvoiceSummary';

describe('InvoiceSummary', () => {
    it('should render service subtotal', () => {
        renderWithLocale(
            <InvoiceSummary
                serviceSubtotal={1000}
                serviceTax={50}
                serviceTotal={1050}
                reimbursementTotal={200}
                grandTotal={1250}
                taxRate={5}
            />
        );

        expect(screen.getByText('服務項目小計：')).toBeInTheDocument();
        expect(screen.getByText('$1,000')).toBeInTheDocument();
    });

    it('should render tax with correct rate', () => {
        renderWithLocale(
            <InvoiceSummary
                serviceSubtotal={1000}
                serviceTax={50}
                serviceTotal={1050}
                reimbursementTotal={0}
                grandTotal={1050}
                taxRate={5}
            />
        );

        expect(screen.getByText(/稅額.*5%/)).toBeInTheDocument();
        expect(screen.getByText('$50')).toBeInTheDocument();
    });

    it('should render service total', () => {
        renderWithLocale(
            <InvoiceSummary
                serviceSubtotal={1000}
                serviceTax={50}
                serviceTotal={1050}
                reimbursementTotal={0}
                grandTotal={1050}
                taxRate={5}
            />
        );

        expect(screen.getByText('服務項目總計：')).toBeInTheDocument();
        // $1,050 appears twice (service total and grand total)
        const values = screen.getAllByText('$1,050');
        expect(values.length).toBeGreaterThanOrEqual(1);
    });

    it('should render reimbursement total when present', () => {
        renderWithLocale(
            <InvoiceSummary
                serviceSubtotal={1000}
                serviceTax={50}
                serviceTotal={1050}
                reimbursementTotal={200}
                grandTotal={1250}
                taxRate={5}
            />
        );

        expect(screen.getByText('代墊項目總計：')).toBeInTheDocument();
        expect(screen.getByText('$200')).toBeInTheDocument();
    });

    it('should not render reimbursement when zero', () => {
        renderWithLocale(
            <InvoiceSummary
                serviceSubtotal={1000}
                serviceTax={50}
                serviceTotal={1050}
                reimbursementTotal={0}
                grandTotal={1050}
                taxRate={5}
            />
        );

        expect(screen.queryByText('代墊項目總計：')).not.toBeInTheDocument();
    });

    it('should render correct grand total', () => {
        renderWithLocale(
            <InvoiceSummary
                serviceSubtotal={1000}
                serviceTax={50}
                serviceTotal={1050}
                reimbursementTotal={200}
                grandTotal={1250}
                taxRate={5}
            />
        );

        expect(screen.getByText('總計：')).toBeInTheDocument();
        expect(screen.getByText('$1,250')).toBeInTheDocument();
    });

    it('should handle zero values', () => {
        renderWithLocale(
            <InvoiceSummary
                serviceSubtotal={0}
                serviceTax={0}
                serviceTotal={0}
                reimbursementTotal={0}
                grandTotal={0}
                taxRate={0}
            />
        );

        // Should have multiple $0 values (subtotal, tax, total, grand total)
        const zeroValues = screen.getAllByText('$0');
        expect(zeroValues.length).toBeGreaterThan(0);
    });
});
