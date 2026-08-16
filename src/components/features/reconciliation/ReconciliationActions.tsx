"use client";

import React from "react";
import { Button } from "@/components/ui/button";
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
    return (
        <div className="flex gap-2">
            {isEditing ? (
                <>
                    <Button variant="outline" onClick={onEditToggle}>
                        <X className="w-4 h-4 mr-2" />
                        取消
                    </Button>
                    <Button onClick={onSave}>
                        <Save className="w-4 h-4 mr-2" />
                        儲存變更
                    </Button>
                </>
            ) : (
                <>
                    {hasTransactions && (
                        <>
                            <Button variant="outline" onClick={onOpenSnapshotDialog}>
                                <Archive className="w-4 h-4 mr-2" />
                                儲存對帳記錄
                            </Button>
                            <Button
                                variant="destructive"
                                className="text-white"
                                onClick={onClear}
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                移除檔案
                            </Button>
                            <Button variant="outline" onClick={onEditToggle}>
                                <Pencil className="w-4 h-4 mr-2" />
                                編輯
                            </Button>
                        </>
                    )}
                    <Button
                        onClick={onAutoMatch}
                        disabled={isMatching || !hasTransactions}
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        {isMatching ? "銷帳中..." : "執行自動銷帳"}
                    </Button>
                </>
            )}
        </div>
    );
}
