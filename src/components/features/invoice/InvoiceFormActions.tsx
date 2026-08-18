"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

interface InvoiceFormActionsProps {
    isSubmitting: boolean;
    isFormDisabled: boolean;
    onCancel?: () => void;
}

export function InvoiceFormActions({
    isSubmitting,
    isFormDisabled,
    onCancel,
}: InvoiceFormActionsProps) {
    const t = useT();
    return (
        <div className="flex justify-end gap-4">
            {onCancel && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    {t("common.cancel")}
                </Button>
            )}
            <Button type="submit" disabled={isSubmitting || isFormDisabled}>
                {isSubmitting ? t("invoicing.form.saving") : t("invoicing.form.submit")}
            </Button>
        </div>
    );
}
