"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SnapshotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    snapshotMonth: string;
    onSnapshotMonthChange: (month: string) => void;
    onConfirm: () => void;
}

export function SnapshotDialog({
    open,
    onOpenChange,
    snapshotMonth,
    onSnapshotMonthChange,
    onConfirm,
}: SnapshotDialogProps) {
    const t = useT();
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby="snapshot-dialog-description">
                <DialogHeader>
                    <DialogTitle>{t("reconciliation.ui.saveSnapshot")}</DialogTitle>
                    <DialogDescription id="snapshot-dialog-description">
                        {t("reconciliation.ui.snapshotWarning")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="month" className="text-right">
                            {t("reconciliation.ui.month")}
                        </Label>
                        <Input
                            id="month"
                            type="month"
                            value={snapshotMonth}
                            onChange={(e) => onSnapshotMonthChange(e.target.value)}
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={onConfirm}>{t("reconciliation.ui.confirmSave")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
