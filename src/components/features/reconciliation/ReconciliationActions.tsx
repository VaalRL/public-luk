"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import {
    X,
    Save,
    Archive,
    Trash2,
    Pencil,
    Zap,
} from "lucide-react";

interface ReconciliationActionsProps {
    isEditing: boolean;
    hasTransactions: boolean;
    isMatching: boolean;
    onEditToggle: () => void;
    onSave: () => void;
    onOpenSnapshotDialog: () => void;
    onClear: () => void;
    onAutoMatch: () => void;
}

export function ReconciliationActions({
    isEditing,
    hasTransactions,
    isMatching,
    onEditToggle,
    onSave,
    onOpenSnapshotDialog,
    onClear,
    onAutoMatch,
}: ReconciliationActionsProps) {
    const t = useT();
    return (
        <div className="flex gap-2">
            {isEditing ? (
                <>
                    <Button variant="outline" onClick={onEditToggle}>
                        <X className="w-4 h-4 mr-2" />
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={onSave}>
                        <Save className="w-4 h-4 mr-2" />
                        {t("reconciliation.ui.saveChanges")}
                    </Button>
                </>
            ) : (
                <>
                    {hasTransactions && (
                        <>
                            <Button variant="outline" onClick={onOpenSnapshotDialog}>
                                <Archive className="w-4 h-4 mr-2" />
                                {t("reconciliation.ui.saveSnapshot")}
                            </Button>
                            <Button
                                variant="destructive"
                                className="text-white"
                                onClick={onClear}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                {t("reconciliation.ui.removeFile")}
                            </Button>
                            <Button variant="outline" onClick={onEditToggle}>
                                <Pencil className="w-4 h-4 mr-2" />
                                {t("common.edit")}
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={onAutoMatch}
                        disabled={isMatching || !hasTransactions}
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        {isMatching ? t("reconciliation.ui.autoMatching") : t("reconciliation.ui.autoMatch")}
                    </Button>
                </>
            )}
        </div>
    );
}
