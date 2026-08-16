"use client";

import React from "react";
import { Button } from "@/components/ui/button";

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
    return (
        <div className="flex justify-end gap-4">
            {onCancel && (
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    取消
                </Button>
            )}
            <Button type="submit" disabled={isSubmitting || isFormDisabled}>
                {isSubmitting ? "儲存中..." : "儲存帳單"}
            </Button>
        </div>
    );
}
