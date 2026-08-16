import { useEffect, useState } from "react";
import { shouldShowCompanyReminder } from "@/app/actions/company";

/**
 * Hook to check if company reminder should be shown
 * Returns true when company count < 2
 */
export function useCompanyReminder() {
    const [showReminder, setShowReminder] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function checkReminder() {
            try {
                const shouldShow = await shouldShowCompanyReminder();
                setShowReminder(shouldShow);
            } catch (error) {
                console.error("Failed to check company reminder:", error);
                setShowReminder(false);
            } finally {
                setIsLoading(false);
            }
        }

        checkReminder();

        // 設置定期檢查（每30秒）
        const interval = setInterval(checkReminder, 30000);

        return () => clearInterval(interval);
    }, []);

    return { showReminder, isLoading };
}
