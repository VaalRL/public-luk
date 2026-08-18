import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithLocale } from '@/test/i18n';
import { DashboardKPIs } from './dashboard-kpis';

const mockStats = {
    totalReceivables: 500000,
    thisMonthBilled: 150000,
    thisMonthCollected: 120000,
    outstandingBalance: 50000,
    totalCompanies: 25,
    totalInvoices: 150,
};

describe('DashboardKPIs Component', () => {
    describe('Rendering', () => {
        it('should render all KPI cards', () => {
            renderWithLocale(<DashboardKPIs stats={mockStats} />);

            expect(screen.getByText('本月應收')).toBeInTheDocument();
            expect(screen.getByText('本月實收')).toBeInTheDocument();
            expect(screen.getByText('未銷帳')).toBeInTheDocument();
            expect(screen.getByText('總應收帳款')).toBeInTheDocument();
            expect(screen.getByText('客戶數')).toBeInTheDocument();
            expect(screen.getByText('帳單總數')).toBeInTheDocument();
        });

        it('should display correct values', () => {
            renderWithLocale(<DashboardKPIs stats={mockStats} />);

            // Currency values should have $ and be formatted
            expect(screen.getByText('$150,000')).toBeInTheDocument(); // thisMonthBilled
            expect(screen.getByText('$120,000')).toBeInTheDocument(); // thisMonthCollected
            expect(screen.getByText('$50,000')).toBeInTheDocument(); // outstandingBalance
            expect(screen.getByText('$500,000')).toBeInTheDocument(); // totalReceivables

            // Count values should not have $
            expect(screen.getByText('25')).toBeInTheDocument(); // totalCompanies
            expect(screen.getByText('150')).toBeInTheDocument(); // totalInvoices
        });
    });

    describe('Formatting', () => {
        it('should format large numbers with commas', () => {
            const largeStats = {
                ...mockStats,
                totalReceivables: 1234567,
            };

            renderWithLocale(<DashboardKPIs stats={largeStats} />);
            expect(screen.getByText('$1,234,567')).toBeInTheDocument();
        });

        it('should handle zero values', () => {
            const zeroStats = {
                totalReceivables: 0,
                thisMonthBilled: 0,
                thisMonthCollected: 0,
                outstandingBalance: 0,
                totalCompanies: 0,
                totalInvoices: 0,
            };

            renderWithLocale(<DashboardKPIs stats={zeroStats} />);

            // Should render $0 for currency values
            const currencyZeros = screen.getAllByText('$0');
            expect(currencyZeros).toHaveLength(4); // 4 currency KPIs

            // Should render 0 for count values
            const countZeros = screen.getAllByText('0');
            expect(countZeros.length).toBeGreaterThanOrEqual(2); // At least 2 count KPIs
        });
    });

    describe('Links', () => {
        it('should render links for KPIs with href', () => {
            renderWithLocale(<DashboardKPIs stats={mockStats} />);

            const links = screen.getAllByRole('link');

            // All 6 KPIs have href, so should be wrapped in links
            expect(links).toHaveLength(6);
        });

        it('should have correct href attributes', () => {
            renderWithLocale(<DashboardKPIs stats={mockStats} />);

            const links = screen.getAllByRole('link');
            const hrefs = links.map(link => link.getAttribute('href'));

            expect(hrefs).toContain('/invoicing');
            // 實收／未銷帳指向對帳頁的彙總區塊
            expect(hrefs.some(h => h?.startsWith('/reconciliation'))).toBe(true);
            // 客戶數指向設定頁（本專案沒有 /companies 路由）
            expect(hrefs).toContain('/settings');
        });

        it('should only link to routes that exist', () => {
            renderWithLocale(<DashboardKPIs stats={mockStats} />);

            const validRoutes = ['/invoicing', '/reconciliation', '/settings', '/dashboard'];
            const hrefs = screen.getAllByRole('link').map(link => link.getAttribute('href'));

            for (const href of hrefs) {
                const path = href?.split('#')[0];
                expect(validRoutes).toContain(path);
            }
        });
    });

    describe('Icons', () => {
        it('should render icons for each KPI', () => {
            const { container } = renderWithLocale(<DashboardKPIs stats={mockStats} />);

            // Each KPI should have an icon (svg element)
            const icons = container.querySelectorAll('svg');
            expect(icons).toHaveLength(6); // 6 KPIs
        });

        it('should apply correct color classes to icons', () => {
            const { container } = renderWithLocale(<DashboardKPIs stats={mockStats} />);

            const icons = container.querySelectorAll('svg');

            // Check that icons have color classes
            expect(icons[0]).toHaveClass('text-blue-600'); // 本月應收
            expect(icons[1]).toHaveClass('text-green-600'); // 本月實收
            expect(icons[2]).toHaveClass('text-amber-600'); // 未銷帳
            expect(icons[3]).toHaveClass('text-purple-600'); // 總應收帳款
            expect(icons[4]).toHaveClass('text-indigo-600'); // 客戶數
            expect(icons[5]).toHaveClass('text-pink-600'); // 帳單總數
        });
    });

    describe('Styling', () => {
        it('should apply hover effects to cards with links', () => {
            const { container } = renderWithLocale(<DashboardKPIs stats={mockStats} />);

            const cards = container.querySelectorAll('[data-slot="card"]');

            cards.forEach(card => {
                expect(card).toHaveClass('hover:shadow-md');
                expect(card).toHaveClass('hover:scale-[1.02]');
            });
        });

        it('should use monospace font for values', () => {
            const { container } = renderWithLocale(<DashboardKPIs stats={mockStats} />);

            const values = container.querySelectorAll('.font-mono');
            expect(values.length).toBeGreaterThan(0);
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            renderWithLocale(<DashboardKPIs stats={mockStats} />);

            // Card titles should be present
            const titles = [
                '本月應收',
                '本月實收',
                '未銷帳',
                '總應收帳款',
                '客戶數',
                '帳單總數',
            ];

            titles.forEach(title => {
                expect(screen.getByText(title)).toBeInTheDocument();
            });
        });

        it('should render links that are keyboard accessible', () => {
            renderWithLocale(<DashboardKPIs stats={mockStats} />);

            const links = screen.getAllByRole('link');

            links.forEach(link => {
                expect(link).toBeVisible();
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle negative values', () => {
            const negativeStats = {
                ...mockStats,
                outstandingBalance: -1000,
            };

            renderWithLocale(<DashboardKPIs stats={negativeStats} />);
            expect(screen.getByText('$-1,000')).toBeInTheDocument();
        });

        it('should handle very large numbers', () => {
            const largeStats = {
                ...mockStats,
                totalReceivables: 999999999,
            };

            renderWithLocale(<DashboardKPIs stats={largeStats} />);
            expect(screen.getByText('$999,999,999')).toBeInTheDocument();
        });

        it('should handle decimal values', () => {
            const decimalStats = {
                ...mockStats,
                thisMonthBilled: 1234.56,
            };

            renderWithLocale(<DashboardKPIs stats={decimalStats} />);
            // toLocaleString() will format decimals
            expect(screen.getByText(/\$1,234/)).toBeInTheDocument();
        });
    });
});
