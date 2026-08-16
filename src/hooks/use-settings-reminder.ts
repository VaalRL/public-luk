import { useEffect, useState } from "react";
import { shouldShowCompanyReminder } from "@/app/actions/company";
import { shouldShowInvoiceItemReminder } from "@/app/actions/invoice-item-template";
import { shouldShowParserReminder } from "@/app/actions/parser";

/**
 * Hook to check if settings reminders should be shown
 * Returns true when:
 * - Company count < 2
 * - Invoice item template count < 1
 * - Parser template count < 1
 */
export function useSettingsReminder() {
    const [showCompanyReminder, setShowCompanyReminder] = useState(false);
    const [showInvoiceItemReminder, setShowInvoiceItemReminder] = useState(false);
    const [showParserReminder, setShowParserReminder] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Any reminder is true if at least one condition is not met
    const showAnyReminder = showCompanyReminder || showInvoiceItemReminder || showParserReminder;

    useEffect(() => {
        async function checkReminders() {
            try {
                const [company, invoiceItem, parser] = await Promise.all([
                    shouldShowCompanyReminder(),
                    shouldShowInvoiceItemReminder(),
                    shouldShowParserReminder(),
                ]);

                setShowCompanyReminder(company);
                setShowInvoiceItemReminder(invoiceItem);
                setShowParserReminder(parser);
            } catch (error) {
                console.error("Failed to check settings reminders:", error);
                setShowCompanyReminder(false);
                setShowInvoiceItemReminder(false);
                setShowParserReminder(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkReminders();

        // 設置定期檢查（每30秒）
        const interval = setInterval(checkReminders, 30000);

        return () => clearInterval(interval);
    }, []);

    return {
        showCompanyReminder,
        showInvoiceItemReminder,
        showParserReminder,
        showAnyReminder,
        isLoading,
    };
}
